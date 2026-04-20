export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ACCEPTED_MIME, normalizeMime } from '@/app/api/parse-pdf/openai-client';
import { IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';

const INTL_SYSTEM_PROMPT =
  'You are an expert at extracting payment processing pricing from documents.';

const INTL_USER_PROMPT = `Extract all Stripe / international pricing fields from this document and return a JSON object with exactly these keys (numeric values only — no $ or % symbols, empty string if not found):

processingRate, processingFlatFee, pricingModel,
year1Commitment, year2Commitment,
connectPayoutRate, connectPayoutFlatFee, connectMonthlyFee, connectActivationFee,
radarStandardFee, radarRfftFee,
intel3dsFee, intelAdaptiveRate, intelCardUpdaterFee, intelNetworkTokenFee,
fxFeeRate, disputeLostFee, disputeFee

Return ONLY the JSON object, no extra text.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada.' }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const rawMime = file.type || 'application/octet-stream';
  const mimeType = normalizeMime(rawMime);

  if (!ACCEPTED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo de arquivo não suportado: ${rawMime}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: INTL_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
          },
          { type: 'text', text: INTL_USER_PROMPT },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  if (!raw) {
    return NextResponse.json({ error: 'OpenAI retornou resposta vazia.' }, { status: 500 });
  }

  let parsed: Partial<IntlPricing>;
  try {
    parsed = JSON.parse(raw) as Partial<IntlPricing>;
  } catch {
    return NextResponse.json({ error: 'Falha ao interpretar resposta do OpenAI.' }, { status: 500 });
  }

  const data: IntlPricing = { ...DEFAULT_INTL_PRICING, ...parsed };

  return NextResponse.json({ data });
}
