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

const PARSE_PROMPT = `You are a financial data extraction specialist.
Analyze this payment proposal document and extract MDR (Merchant Discount Rate) data.

Return ONLY valid JSON in this exact structure (no extra text, no markdown):
{
  "rates": [
    {
      "brand": "visa|mastercard|elo|amex|hipercard",
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
  "confidence": "high|medium|low",
  "missingData": ["list of missing fields"]
}

Rules:
- brand must be one of: visa, mastercard, elo, amex, hipercard
- mdrBase and anticipationRate as decimal strings with 2 decimal places
- If installments are grouped (e.g. "2-6x = 3.5%"), use installmentFrom/installmentTo range
- If anticipation rate is not listed separately, set anticipationRate to "0.00"
- If a brand is not present in the document, omit it from the rates array
- Extract all installment tiers you can find (1x, 2x, ... 12x)`;

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

function extractJson(text: string): ParsedRates {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]);
}

// ── Gemini ──────────────────────────────────────────────────────────────────
async function callGemini(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    PARSE_PROMPT,
  ]);

  return result.response.text();
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function callOpenAI(base64: string, mimeType: string, isPdf: boolean): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const client = new OpenAI({ apiKey });

  if (isPdf) {
    // OpenAI doesn't support PDF vision — upload as file then use Assistants or just pass as text hint
    // Fallback: treat as unsupported and throw so Anthropic is tried
    throw new Error('PDF_UNSUPPORTED');
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
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
      max_tokens: 2048,
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

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Parse form data
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o arquivo enviado.' }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

  const mimeType = file.type || 'application/octet-stream';
  if (!ACCEPTED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo não suportado: ${mimeType}. Use PDF, PNG, JPG ou WebP.` },
      { status: 415 }
    );
  }

  const isPdf = mimeType === 'application/pdf';
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');

  // 2. Try providers in order: Gemini → OpenAI → Anthropic
  const providers = [
    { name: 'Gemini', fn: () => callGemini(base64, mimeType) },
    { name: 'OpenAI', fn: () => callOpenAI(base64, mimeType, isPdf) },
    { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
  ];

  let lastError = '';
  let rawText = '';

  for (const provider of providers) {
    try {
      rawText = await provider.fn();
      console.log(`[parse-pdf] Success via ${provider.name}`);
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_KEY' || msg === 'PDF_UNSUPPORTED') {
        continue; // skip silently — key not configured or format not supported
      }
      console.warn(`[parse-pdf] ${provider.name} failed:`, msg);
      lastError = msg;
    }
  }

  if (!rawText) {
    const hint = lastError.includes('401')
      ? 'Verifique se as chaves de API estão corretas no Vercel.'
      : lastError.includes('429')
      ? 'Limite de requisições atingido. Aguarde e tente novamente.'
      : 'Configure ao menos uma chave de API (GEMINI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY).';

    return NextResponse.json({ error: `Nenhum provider disponível. ${hint}` }, { status: 503 });
  }

  // 3. Parse JSON
  let parsed: ParsedRates;
  try {
    parsed = extractJson(rawText);
  } catch {
    console.error('[parse-pdf] Bad JSON from AI:', rawText.slice(0, 500));
    return NextResponse.json(
      { error: 'A IA retornou um formato inesperado. Tente com um arquivo mais legível.' },
      { status: 422 }
    );
  }

  // 4. Build MDR matrix
  let matrix = createEmptyMatrix();
  for (const rate of parsed.rates ?? []) {
    if (!BRANDS.includes(rate.brand)) continue;
    const partial = expandGroupedRates([
      {
        from: rate.installmentFrom,
        to: rate.installmentTo,
        mdrBase: rate.mdrBase,
        anticipationRate: rate.anticipationRate ?? '0.00',
      },
    ]);
    matrix = mergePartialMatrix(matrix, rate.brand, partial);
  }

  return NextResponse.json({
    matrix,
    fees: parsed.fees ?? {},
    confidence: parsed.confidence ?? 'low',
    missingData: parsed.missingData ?? [],
  });
}
