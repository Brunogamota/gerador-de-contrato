import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName, INSTALLMENTS } from '@/types/pricing';
import { createEmptyMatrix, expandGroupedRates, mergePartialMatrix } from '@/lib/calculations/mdr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PARSE_PROMPT = `You are a financial data extraction specialist.
Analyze this payment proposal document and extract MDR (Merchant Discount Rate) data.

Return ONLY valid JSON in this exact structure (no extra text):
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
- If anticipation is not separate, set anticipationRate to "0.00"
- If a brand is not present, omit it from rates array`;

async function callGemini(base64: string, mimeType: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: PARSE_PROMPT },
          ],
        }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    let msg = `Gemini ${res.status}`;
    try { msg = JSON.parse(err)?.error?.message ?? msg; } catch { /* keep */ }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAI(base64: string, mimeType: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          { type: 'text', text: PARSE_PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    let msg = `OpenAI ${res.status}`;
    try { msg = JSON.parse(err)?.error?.message ?? msg; } catch { /* keep */ }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function parseAiText(text: string): {
  rates: Array<{
    brand: BrandName;
    installmentFrom: number;
    installmentTo: number;
    mdrBase: string;
    anticipationRate?: string;
  }>;
  fees?: { anticipationRate?: string; chargebackFee?: string };
  confidence: string;
  missingData: string[];
} {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : text);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        { error: 'Nenhuma API key configurada. Adicione GEMINI_API_KEY ou OPENAI_API_KEY nas variáveis de ambiente.' },
        { status: 503 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Limite: 20 MB.' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const mimeType = isPdf
      ? 'application/pdf'
      : file.type.startsWith('image/')
      ? file.type
      : 'image/jpeg';

    let rawText = '';
    let usedProvider = '';
    const errors: string[] = [];

    // 1. Try Gemini first (supports PDF + images natively)
    if (geminiKey) {
      try {
        rawText = await callGemini(base64, mimeType, geminiKey);
        usedProvider = 'gemini';
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Gemini: ${msg}`);
        console.error('Gemini failed:', msg);
      }
    }

    // 2. Fallback to OpenAI (supports images; PDFs sent as image_url — works with gpt-4o)
    if (!rawText && openaiKey) {
      try {
        rawText = await callOpenAI(base64, mimeType, openaiKey);
        usedProvider = 'openai';
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`OpenAI: ${msg}`);
        console.error('OpenAI failed:', msg);
      }
    }

    if (!rawText) {
      return NextResponse.json(
        { error: errors.join(' | ') || 'Todos os provedores falharam.' },
        { status: 502 }
      );
    }

    let parsed: ReturnType<typeof parseAiText>;
    try {
      parsed = parseAiText(rawText);
    } catch {
      return NextResponse.json({ error: 'Resposta da IA não é JSON válido.', raw: rawText }, { status: 422 });
    }

    let matrix = createEmptyMatrix();
    for (const rate of parsed.rates ?? []) {
      if (!BRANDS.includes(rate.brand)) continue;
      const partial = expandGroupedRates([{
        from: rate.installmentFrom,
        to: rate.installmentTo,
        mdrBase: rate.mdrBase,
        anticipationRate: rate.anticipationRate ?? '0.00',
      }]);
      matrix = mergePartialMatrix(matrix, rate.brand, partial);
    }

    return NextResponse.json({
      matrix,
      fees: parsed.fees ?? {},
      confidence: parsed.confidence,
      missingData: parsed.missingData ?? [],
      provider: usedProvider,
    });
  } catch (err) {
    console.error('parse-pdf error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
