import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName } from '@/types/pricing';
import { createEmptyMatrix, expandGroupedRates, mergePartialMatrix } from '@/lib/calculations/mdr';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function normalizeMime(m: string): string {
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

const PARSE_PROMPT = `You are a Brazilian payment industry specialist extracting MDR rate tables.

## OUTPUT FORMAT
Return ONLY a raw JSON object. No markdown, no code fences, no explanation.

{
  "anticipationIncluded": false,
  "globalAnticipationRate": "0.00",
  "rates": [
    {
      "brands": ["visa"],
      "installment": 1,
      "displayedRate": "2.50"
    }
  ],
  "fees": {
    "anticipationRate": "0.00",
    "chargebackFee": "0.00"
  },
  "confidence": "high",
  "missingData": []
}

## STEP-BY-STEP EXTRACTION

### STEP 1 — Detect anticipation mode
Look for text like "Antecipação D+X · Acréscimo de Y%" or "Taxa de antecipação: Y%" near the table header.
- If found: set anticipationIncluded=true and globalAnticipationRate="Y.YY" (the acréscimo value)
- If not found: set anticipationIncluded=false and globalAnticipationRate="0.00"

### STEP 2 — Identify columns
The table has columns for each brand. Common column names and their mapping:
- "Visa" → ["visa"]
- "Master" or "Mastercard" → ["mastercard"]
- "Elo" → ["elo"]
- "Amex" → ["amex"]
- "Hipercard" or "Hiper" → ["hipercard"]
- "Amex/Hiper/Outras" or "Amex/Hiper" → ["amex", "hipercard"]
- "Demais" or "Outras" → ["amex", "hipercard"]

### STEP 3 — Read ALL rows
The table has rows for installments: 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x, 11x, 12x.
For EACH row, for EACH brand column, create one entry in the rates array:
{
  "brands": ["visa"],
  "installment": 3,
  "displayedRate": "3.95"
}

A table with 4 brand columns and 12 rows = 48 entries minimum.
DO NOT skip any row. DO NOT group rows unless they have IDENTICAL rates for consecutive installments.

### STEP 4 — fees
- fees.anticipationRate = globalAnticipationRate (the acréscimo %)
- fees.chargebackFee = chargeback fee in BRL if visible, else "0.00"

## RULES
- displayedRate: exactly what is printed in the cell, as decimal string "3.95" (not "3,95")
- installment: integer 1 to 12
- brands: array of brand strings from this set only: visa, mastercard, elo, amex, hipercard
- confidence: "high" if table clearly readable, "medium" if some values inferred, "low" if guessing
- missingData: list any installments or brands you could not read`;

type RawRate = {
  brands: string[];
  installment: number;
  displayedRate: string;
};

type RawParsed = {
  anticipationIncluded: boolean;
  globalAnticipationRate: string;
  rates: RawRate[];
  fees?: { anticipationRate?: string; chargebackFee?: string };
  confidence: 'high' | 'medium' | 'low';
  missingData: string[];
};

function extractJson(raw: string): RawParsed {
  // Remove markdown code fences
  const text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Balanced-brace extraction
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found');

  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error('Unclosed JSON object');
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed.rates)) throw new Error('Missing rates array');
  return parsed as RawParsed;
}

function safeRate(val: string | number | undefined): number {
  const n = parseFloat(String(val ?? '0').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function toFixed2(n: number): string {
  return n.toFixed(2);
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    { text: PARSE_PROMPT },
  ]);

  return result.response.text();
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function callOpenAI(base64: string, mimeType: string, isPdf: boolean): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  if (isPdf) throw new Error('PDF_UNSUPPORTED');

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8192,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: PARSE_PROMPT },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}

// ── Anthropic ────────────────────────────────────────────────────────────────
async function callAnthropic(base64: string, mimeType: string, isPdf: boolean): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  type AnthropicBlock =
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
    | { type: 'text'; text: string };

  const fileBlock: AnthropicBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } };

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    ...(isPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: PARSE_PROMPT }] }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ANTHROPIC_${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.content?.[0]?.text ?? '';
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o arquivo enviado.' }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

  const rawMime = file.type || 'application/octet-stream';
  const mimeType = normalizeMime(rawMime);

  if (!ACCEPTED_MIME.has(rawMime) && !ACCEPTED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo não suportado: ${rawMime}. Use PDF, PNG, JPG ou WebP.` },
      { status: 415 }
    );
  }

  const isPdf = mimeType === 'application/pdf';
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');

  const providers = [
    { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
    { name: 'OpenAI',    fn: () => callOpenAI(base64, mimeType, isPdf) },
    { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
  ];

  let lastError = '';
  let rawText = '';

  for (const provider of providers) {
    try {
      rawText = await provider.fn();
      console.log(`[parse-pdf] ${provider.name} OK (${rawText.length} chars)`);
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_KEY' || msg === 'PDF_UNSUPPORTED') continue;
      console.warn(`[parse-pdf] ${provider.name} failed:`, msg);
      lastError = msg;
    }
  }

  if (!rawText) {
    const hint = lastError.includes('401')
      ? 'Verifique as chaves de API no Vercel.'
      : lastError.includes('429')
      ? 'Limite de requisições atingido. Aguarde e tente novamente.'
      : 'Configure GEMINI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY.';
    return NextResponse.json({ error: `Nenhum provider disponível. ${hint}` }, { status: 503 });
  }

  let parsed: RawParsed;
  try {
    parsed = extractJson(rawText);
  } catch (e) {
    console.error('[parse-pdf] JSON parse failed. Raw (1000 chars):', rawText.slice(0, 1000));
    console.error('[parse-pdf] Error:', e);
    return NextResponse.json(
      { error: 'A IA retornou um formato inesperado. Tente com uma imagem mais nítida.' },
      { status: 422 }
    );
  }

  // ── Build MDR matrix ──────────────────────────────────────────────────────
  // If rates already include anticipation, split: mdrBase = displayed - anticipation
  const anticipationIncluded = parsed.anticipationIncluded === true;
  const globalAntRate = safeRate(parsed.globalAnticipationRate);

  let matrix = createEmptyMatrix();

  for (const rate of parsed.rates ?? []) {
    const displayed = safeRate(rate.displayedRate);
    const inst = Math.min(12, Math.max(1, Number(rate.installment) || 1));

    let mdrBase: number;
    let antRate: number;

    if (anticipationIncluded && globalAntRate > 0) {
      // CET final já antecipado: desconta a antecipação para obter a taxa base
      mdrBase = Math.max(0, displayed - globalAntRate);
      antRate = globalAntRate;
    } else {
      mdrBase = displayed;
      antRate = 0;
    }

    const rawBrands = Array.isArray(rate.brands) ? rate.brands : [rate.brands];
    for (const rawBrand of rawBrands) {
      const brand = String(rawBrand ?? '').toLowerCase().trim() as BrandName;
      if (!BRANDS.includes(brand)) {
        console.warn(`[parse-pdf] Unknown brand skipped: "${rawBrand}"`);
        continue;
      }

      const partial = expandGroupedRates([{
        from: inst,
        to: inst,
        mdrBase: toFixed2(mdrBase),
        anticipationRate: toFixed2(antRate),
      }]);
      matrix = mergePartialMatrix(matrix, brand, partial);
    }
  }

  // Build fees response
  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (anticipationIncluded && globalAntRate > 0) {
    fees.anticipationRate = toFixed2(globalAntRate);
  } else if (parsed.fees?.anticipationRate) {
    fees.anticipationRate = parsed.fees.anticipationRate;
  }
  if (parsed.fees?.chargebackFee) {
    fees.chargebackFee = parsed.fees.chargebackFee;
  }

  return NextResponse.json({
    matrix,
    fees,
    confidence: parsed.confidence ?? 'low',
    missingData: parsed.missingData ?? [],
  });
}
