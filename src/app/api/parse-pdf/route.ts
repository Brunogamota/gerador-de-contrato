import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import { MDREntry } from '@/types/pricing';
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

// Simple matrix format — much easier for AI to fill correctly
const PARSE_PROMPT = `You are extracting an MDR rate table from a Brazilian payment proposal image.

## WHAT TO OUTPUT
A single raw JSON object. No markdown, no code fences, no explanation, just the JSON.

## JSON STRUCTURE
{
  "anticipationRate": "1.78",
  "ratesIncludeAnticipation": true,
  "table": {
    "visa":       {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "mastercard": {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "elo":        {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "amex":       {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "hipercard":  {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""}
  },
  "chargebackFee": "0.00",
  "confidence": "high",
  "missingData": []
}

## HOW TO FILL
1. anticipationRate: look for text like "Acréscimo de X%" or "Taxa de antecipação: X%" near the table. Extract X as a decimal string like "1.78". If not found, use "0.00".
2. ratesIncludeAnticipation: true if the header says the rates already include anticipation (e.g. "Antecipação D+2 · Acréscimo de 1,78%"). Otherwise false.
3. table: fill EVERY cell for rows 1 through 12 and all brands that appear in the document.
   - Each value is the percentage shown in that cell as a decimal string: "3.95" (use dot, not comma)
   - If the document has a column "Amex/Hiper/Outras" or "Amex/Hiper" or "Outras", use those same values for BOTH "amex" and "hipercard"
   - If a brand is completely absent from the document, leave all its cells as ""
   - DO NOT leave any row empty for a brand that has data — fill all 12 rows
4. chargebackFee: chargeback fee in BRL if visible (e.g. "65.00"), else "0.00"
5. confidence: "high" if clearly readable, "medium" if some values uncertain, "low" if mostly guessing
6. missingData: list any brand or row you could not read`;

// Raw parsed structure from AI
type RawTable = {
  [brand: string]: { [inst: string]: string };
};

type RawParsed = {
  anticipationRate: string;
  ratesIncludeAnticipation: boolean;
  table: RawTable;
  chargebackFee?: string;
  confidence: 'high' | 'medium' | 'low';
  missingData: string[];
};

function extractJson(raw: string): RawParsed {
  const text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
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
  if (!parsed.table || typeof parsed.table !== 'object') throw new Error('Missing table object');
  return parsed as RawParsed;
}

function safeNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use Pro for better table reading accuracy
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 4096,
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
    max_tokens: 4096,
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

  type Block =
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
    | { type: 'text'; text: string };

  const fileBlock: Block = isPdf
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
      max_tokens: 4096,
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

  // ── Build MDR matrix from flat table ─────────────────────────────────────
  const antRate = safeNum(parsed.anticipationRate);
  const includesAnt = parsed.ratesIncludeAnticipation === true && antRate > 0;

  let matrix = createEmptyMatrix();
  const missingBrands: string[] = [...(parsed.missingData ?? [])];

  for (const brand of BRANDS) {
    const brandData = parsed.table[brand];
    if (!brandData) continue;

    const partial: Partial<Record<number, MDREntry>> = {};
    let hasAnyValue = false;

    for (let inst = 1; inst <= 12; inst++) {
      const raw = brandData[String(inst)];
      const displayed = safeNum(raw);
      if (displayed === 0) continue;

      hasAnyValue = true;

      let mdrBase: number;
      let entryAntRate: number;

      if (includesAnt) {
        // CET já antecipado: subtrair taxa de antecipação para obter base
        mdrBase = Math.max(0, displayed - antRate);
        entryAntRate = antRate;
      } else {
        mdrBase = displayed;
        entryAntRate = 0;
      }

      const mdrBaseStr = mdrBase.toFixed(4);
      const antRateStr = entryAntRate.toFixed(4);
      const finalMdr = (mdrBase + entryAntRate).toFixed(4);

      partial[inst] = {
        mdrBase: mdrBaseStr,
        anticipationRate: antRateStr,
        finalMdr,
        isManualOverride: false,
      };
    }

    if (hasAnyValue) {
      matrix = mergePartialMatrix(matrix, brand as BrandName, partial);
    } else if (!missingBrands.includes(brand)) {
      // Only flag as missing if not already reported
      // (leave it out — it may simply not be in the document)
    }
  }

  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (parsed.chargebackFee && safeNum(parsed.chargebackFee) > 0) {
    fees.chargebackFee = parsed.chargebackFee;
  }

  return NextResponse.json({
    matrix,
    fees,
    confidence: parsed.confidence ?? 'low',
    missingData: parsed.missingData ?? [],
  });
}
