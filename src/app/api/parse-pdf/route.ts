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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured. Set it in .env to enable AI parsing.' },
        { status: 503 }
      );
    }

    // Validate file size (Anthropic limit: 32 MB)
    if (file.size > 32 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Limite: 32 MB.' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Detect PDF by MIME type OR file extension (file.type can be wrong on some browsers)
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    const mediaType = isPdf
      ? 'application/pdf'
      : file.type.startsWith('image/')
      ? file.type
      : 'image/jpeg';

    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

    // anthropic-beta 'pdfs-2024-09-25' is only required for document blocks
    const extraHeaders: Record<string, string> = isPdf
      ? { 'anthropic-beta': 'pdfs-2024-09-25' }
      : {};

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              fileBlock,
              { type: 'text', text: PARSE_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      let detail = 'AI parsing failed';
      try {
        const j = JSON.parse(errBody);
        if (j?.error?.message) detail = j.error.message;
      } catch { /* keep default */ }
      return NextResponse.json(
        { error: detail, status: response.status },
        { status: 502 }
      );
    }

    const aiResult = await response.json();
    const text = aiResult.content?.[0]?.text ?? '';

    let parsed: {
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
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 422 });
    }

    // Build matrix from parsed rates
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
      confidence: parsed.confidence,
      missingData: parsed.missingData ?? [],
    });
  } catch (err) {
    console.error('parse-pdf error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
