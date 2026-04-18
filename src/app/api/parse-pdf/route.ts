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

// Normalize browser-reported MIME types that differ from what APIs expect
function normalizeMime(mimeType: string): string {
  if (mimeType === 'image/jpg') return 'image/jpeg';
  return mimeType;
}

const PARSE_PROMPT = `You are a payment industry data extraction specialist analyzing a Brazilian payment proposal.

Extract ALL MDR (Merchant Discount Rate) data and return ONLY a raw JSON object — no markdown, no code fences, no explanation.

JSON structure:
{
  "rates": [
    {
      "brand": "visa",
      "installmentFrom": 1,
      "installmentTo": 1,
      "mdrBase": "2.50",
      "anticipationRate": "0.00"
    }
  ],
  "fees": {
    "anticipationRate": "1.45",
    "chargebackFee": "65.00"
  },
  "confidence": "high",
  "missingData": []
}

CRITICAL RULES — follow exactly:
1. brand must be one of: visa, mastercard, elo, amex, hipercard (lowercase, exact spelling)
2. ALL rates must be decimal strings with 2 decimal places: "2.50" not 2.5 or "2,50"
3. You MUST cover all 12 installments (1x through 12x) for EACH brand found in the document.
   - If the document shows a single rate for all installments (e.g. "Visa débito/crédito: 2.50%"), output one entry with installmentFrom:1, installmentTo:12
   - If the document shows grouped ranges (e.g. "1x: 2.0% / 2-6x: 2.5% / 7-12x: 3.0%"), output one entry per group
   - If the document shows individual rows for each installment, output one entry per installment (installmentFrom equals installmentTo)
   - NEVER skip installment ranges — the entire 1-12 range must be covered per brand
4. anticipationRate per installment: if the document separates "taxa de antecipação" per installment, include it; otherwise use "0.00"
5. fees.anticipationRate: the global anticipation fee percentage (e.g. "1.99")
6. fees.chargebackFee: the chargeback fee in BRL (e.g. "65.00")
7. confidence: "high" if data is clearly readable, "medium" if some values inferred, "low" if mostly guessed
8. missingData: list any brands or installment ranges you could not find
9. Do NOT invent data. If a brand is absent from the document, omit it from rates entirely.`;

type ParsedRates = {
  rates: Array<{
    brand: BrandName;
    installmentFrom: number;
    installmentTo: number;
    mdrBase: string;
    anticipationRate?: string;
  }>;
  fees?: { anticipationRate?: string; chargebackFee?: string };
  confidence: 'high' | 'medium' | 'low';
  missingData: string[];
};

// Strip markdown code fences and extract the first complete JSON object
function extractJson(raw: string): ParsedRates {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  let text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Find the outermost { ... } block
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
  const jsonStr = text.slice(start, end + 1);

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed.rates)) throw new Error('Missing rates array');
  return parsed as ParsedRates;
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      // Force pure JSON output — no markdown wrapping
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

  // OpenAI vision doesn't support PDF — skip to next provider
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

  // Try providers: Gemini → OpenAI → Anthropic
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
      console.log(`[parse-pdf] Success via ${provider.name} (${rawText.length} chars)`);
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
      ? 'Verifique se as chaves de API estão corretas no Vercel.'
      : lastError.includes('429')
      ? 'Limite de requisições atingido. Aguarde e tente novamente.'
      : 'Configure ao menos uma chave: GEMINI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY.';

    return NextResponse.json({ error: `Nenhum provider disponível. ${hint}` }, { status: 503 });
  }

  // Parse JSON — with detailed logging on failure
  let parsed: ParsedRates;
  try {
    parsed = extractJson(rawText);
  } catch (e) {
    console.error('[parse-pdf] JSON parse failed. Raw response (first 1000 chars):', rawText.slice(0, 1000));
    console.error('[parse-pdf] Parse error:', e);
    return NextResponse.json(
      { error: 'A IA retornou um formato inesperado. Tente com um arquivo mais legível ou menor.' },
      { status: 422 }
    );
  }

  // Build MDR matrix from grouped rate entries
  let matrix = createEmptyMatrix();
  for (const rate of parsed.rates ?? []) {
    const brand = rate.brand?.toLowerCase() as BrandName;
    if (!BRANDS.includes(brand)) {
      console.warn(`[parse-pdf] Unknown brand skipped: ${rate.brand}`);
      continue;
    }
    const from = Math.max(1, Number(rate.installmentFrom) || 1);
    const to   = Math.min(12, Number(rate.installmentTo)  || from);
    const partial = expandGroupedRates([{
      from,
      to,
      mdrBase: String(rate.mdrBase ?? '0'),
      anticipationRate: String(rate.anticipationRate ?? '0'),
    }]);
    matrix = mergePartialMatrix(matrix, brand, partial);
  }

  return NextResponse.json({
    matrix,
    fees: parsed.fees ?? {},
    confidence: parsed.confidence ?? 'low',
    missingData: parsed.missingData ?? [],
  });
}
