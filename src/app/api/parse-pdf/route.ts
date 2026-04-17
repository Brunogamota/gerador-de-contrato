import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName } from '@/types/pricing';
import { createEmptyMatrix, expandGroupedRates, mergePartialMatrix } from '@/lib/calculations/mdr';

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

type AnthropicContent =
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
  | { type: 'text'; text: string };

export async function POST(req: NextRequest) {
  // ── 1. Validate API key ──────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'ANTHROPIC_API_KEY não configurada.',
        hint: 'Adicione ANTHROPIC_API_KEY ao seu arquivo .env.local e reinicie o servidor.',
      },
      { status: 503 }
    );
  }

  // ── 2. Parse form data ───────────────────────────────────────────────────────
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o arquivo enviado.' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const mimeType = file.type || 'application/octet-stream';

  if (!ACCEPTED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo de arquivo não suportado: ${mimeType}. Use PDF, PNG, JPG ou WebP.` },
      { status: 415 }
    );
  }

  // ── 3. Encode file ───────────────────────────────────────────────────────────
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');

  // ── 4. Build Anthropic content block ────────────────────────────────────────
  // PDFs require type:"document" — the image block only accepts image/* MIME types.
  const fileBlock: AnthropicContent =
    mimeType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } };

  const content: AnthropicContent[] = [
    fileBlock,
    { type: 'text', text: PARSE_PROMPT },
  ];

  // ── 5. Call Anthropic API ────────────────────────────────────────────────────
  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };

  // PDF document blocks require the beta header
  if (mimeType === 'application/pdf') {
    headers['anthropic-beta'] = 'pdfs-2024-09-25';
  }

  let aiResponse: Response;
  try {
    aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    console.error('[parse-pdf] Network error calling Anthropic:', err);
    return NextResponse.json(
      { error: 'Falha de rede ao contatar a IA. Verifique sua conexão.' },
      { status: 502 }
    );
  }

  if (!aiResponse.ok) {
    const body = await aiResponse.text();
    console.error(`[parse-pdf] Anthropic ${aiResponse.status}:`, body);

    // Surface actionable errors instead of hiding them
    if (aiResponse.status === 401) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY inválida. Verifique o valor no .env.local.' },
        { status: 401 }
      );
    }
    if (aiResponse.status === 429) {
      return NextResponse.json(
        { error: 'Limite de requisições da IA atingido. Aguarde alguns segundos e tente novamente.' },
        { status: 429 }
      );
    }
    if (aiResponse.status === 413 || body.includes('too large')) {
      return NextResponse.json(
        { error: 'Arquivo muito grande para a IA processar. Tente um PDF menor (< 10 MB).' },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: `Erro da IA (HTTP ${aiResponse.status}). Tente novamente.` },
      { status: 502 }
    );
  }

  // ── 6. Parse AI response ─────────────────────────────────────────────────────
  const aiResult = await aiResponse.json();
  const text: string = aiResult.content?.[0]?.text ?? '';

  let parsed: {
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

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error('[parse-pdf] Failed to parse AI JSON. Raw:', text.slice(0, 500));
    return NextResponse.json(
      { error: 'A IA retornou um formato inesperado. Tente novamente com um arquivo mais legível.' },
      { status: 422 }
    );
  }

  // ── 7. Build MDR matrix ──────────────────────────────────────────────────────
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
