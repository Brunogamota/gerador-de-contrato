import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import { MDREntry } from '@/types/pricing';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACCEPTED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
]);

function normalizeMime(m: string): string {
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

// ─── Prompt: ask for markdown table (much more reliable than nested JSON) ───
const PARSE_PROMPT = `You are reading a Brazilian payment proposal image to extract MDR rates.

Output EXACTLY this format and nothing else (no prose, no markdown fences):

ANTICIPATION_RATE: X.XX
INCLUDED_IN_RATES: true|false
COMBINED_AMEX_HIPER: true|false
CHARGEBACK_FEE: 0.00
CONFIDENCE: high|medium|low

| Parc | visa | mastercard | elo | amex | hipercard |
|------|------|------------|-----|------|-----------|
| 1 | 2.69 | 2.59 | 3.19 | 3.49 | 3.49 |
| 2 | 3.05 | 2.95 | 3.95 | 4.19 | 4.19 |
| 3 | ... | ... | ... | ... | ... |
... (continue for ALL 12 rows, do not stop early)
| 12 | ... | ... | ... | ... | ... |

RULES:
- ANTICIPATION_RATE: number after "Acréscimo de" or "Taxa de antecipação" (e.g. "1.78"). If absent, "0.00".
- INCLUDED_IN_RATES: true if header says rates already include anticipation (e.g. "Antecipação D+2 · Acréscimo de 1,78%" means the table values already have the 1.78% added). Otherwise false.
- COMBINED_AMEX_HIPER: true if the source column is labeled "Amex/Hiper/Outras", "Amex/Hiper", or similar combined header. When true, put the SAME values in both amex and hipercard columns.
- Each rate cell: decimal number with dot (e.g. "2.69"). Use "—" only if a brand is completely absent from the document.
- You MUST output all 12 rows (1 through 12). Do not skip any row.
- If a brand column is absent from the document, fill that entire column with "—".
- Use lowercase brand names exactly: visa, mastercard, elo, amex, hipercard`;

type ParsedHeader = {
  anticipationRate: number;
  includedInRates: boolean;
  combinedAmexHiper: boolean;
  chargebackFee: number;
  confidence: 'high' | 'medium' | 'low';
};

type ParsedTable = {
  header: ParsedHeader;
  rows: Array<{ inst: number; rates: Record<string, number | null> }>;
};

function parseHeaderValue(text: string, key: string): string {
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'mi');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function parseResponse(raw: string): ParsedTable {
  const text = raw.replace(/```\w*\s*/g, '').replace(/```/g, '').trim();

  // Extract header metadata
  const antRateStr = parseHeaderValue(text, 'ANTICIPATION_RATE');
  const includedStr = parseHeaderValue(text, 'INCLUDED_IN_RATES').toLowerCase();
  const combinedStr = parseHeaderValue(text, 'COMBINED_AMEX_HIPER').toLowerCase();
  const chargebackStr = parseHeaderValue(text, 'CHARGEBACK_FEE');
  const confidenceStr = parseHeaderValue(text, 'CONFIDENCE').toLowerCase();

  const header: ParsedHeader = {
    anticipationRate: parseFloat(antRateStr.replace(',', '.')) || 0,
    includedInRates: includedStr === 'true',
    combinedAmexHiper: combinedStr === 'true',
    chargebackFee: parseFloat(chargebackStr.replace(',', '.')) || 0,
    confidence: (['high', 'medium', 'low'].includes(confidenceStr) ? confidenceStr : 'medium') as 'high' | 'medium' | 'low',
  };

  // Extract markdown table rows
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 3) throw new Error(`Table not found in response. Got ${lines.length} table lines.`);

  // First pipe line = header, second = separator, rest = data
  const headerLine = lines[0];
  const columnNames = headerLine.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);

  // columnNames[0] should be "parc" or similar; rates start at index 1
  const brandColumns = columnNames.slice(1);

  const rows: ParsedTable['rows'] = [];
  for (const line of lines.slice(2)) {
    const cells = line.split('|').map(s => s.trim()).filter((_, i, arr) => i !== 0 || arr.length > 1);
    // First non-empty cell is installment number
    const parts = line.split('|').map(s => s.trim());
    // Skip leading/trailing empty cells from |...|
    const clean = parts.filter((_, i) => i !== 0 && i !== parts.length - 1);
    if (clean.length === 0) continue;

    const instStr = clean[0].replace(/[^\d]/g, '');
    const inst = parseInt(instStr, 10);
    if (!inst || inst < 1 || inst > 12) continue;

    const rates: Record<string, number | null> = {};
    for (let i = 0; i < brandColumns.length; i++) {
      const cellValue = clean[i + 1] ?? '';
      if (!cellValue || cellValue === '—' || cellValue === '-' || cellValue === '') {
        rates[brandColumns[i]] = null;
      } else {
        const n = parseFloat(cellValue.replace(',', '.').replace('%', ''));
        rates[brandColumns[i]] = isNaN(n) ? null : n;
      }
    }

    rows.push({ inst, rates });
  }

  if (rows.length === 0) throw new Error('No data rows parsed from table');

  return { header, rows };
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.05, maxOutputTokens: 2048 },
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
    max_tokens: 2048,
    temperature: 0.05,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
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

  // ── Provider order: OpenAI first for images (best table reader) ──────────
  // Gemini first only for PDFs (OpenAI vision doesn't accept PDFs)
  const providers = isPdf
    ? [
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
      ]
    : [
        { name: 'OpenAI',    fn: () => callOpenAI(base64, mimeType, isPdf) },
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
      ];

  let lastError = '';
  let rawText = '';
  let usedProvider = '';

  for (const provider of providers) {
    try {
      rawText = await provider.fn();
      usedProvider = provider.name;
      console.log(`[parse-pdf] ${provider.name} OK — ${rawText.length} chars`);
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

  console.log(`[parse-pdf] Raw response from ${usedProvider}:`, rawText.slice(0, 800));

  let parsed: ParsedTable;
  try {
    parsed = parseResponse(rawText);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error('[parse-pdf] Parse failed:', err);
    console.error('[parse-pdf] Full raw response:', rawText);
    return NextResponse.json(
      {
        error: `Falha ao interpretar resposta da IA (${usedProvider}): ${err}`,
        debug: { provider: usedProvider, preview: rawText.slice(0, 500) },
      },
      { status: 422 }
    );
  }

  // ── Apply combined Amex/Hipercard logic ──────────────────────────────────
  const { header, rows } = parsed;
  const brandMap: Record<string, BrandName | null> = {
    visa: 'visa',
    mastercard: 'mastercard',
    master: 'mastercard',
    elo: 'elo',
    amex: 'amex',
    hipercard: 'hipercard',
    hiper: 'hipercard',
  };

  // Check if hipercard column is all null/empty but amex has data → treat as combined
  const amexHasData = rows.some(r => r.rates['amex'] != null);
  const hiperHasData = rows.some(r => r.rates['hipercard'] != null);
  const shouldCopyAmexToHiper = header.combinedAmexHiper || (amexHasData && !hiperHasData);

  // ── Build matrix ──────────────────────────────────────────────────────────
  const antRate = header.anticipationRate;
  const includesAnt = header.includedInRates && antRate > 0;

  // Accumulator per brand
  const perBrand: Record<BrandName, Partial<Record<number, MDREntry>>> = {
    visa: {}, mastercard: {}, elo: {}, amex: {}, hipercard: {},
  };

  for (const row of rows) {
    for (const [colName, rateValue] of Object.entries(row.rates)) {
      const brand = brandMap[colName.toLowerCase()];
      if (!brand || rateValue == null) continue;

      let mdrBase: number;
      let entryAnt: number;

      if (includesAnt) {
        mdrBase = Math.max(0, Math.round((rateValue - antRate) * 10000) / 10000);
        entryAnt = antRate;
      } else {
        mdrBase = rateValue;
        entryAnt = 0;
      }

      perBrand[brand][row.inst] = {
        mdrBase: mdrBase.toFixed(4),
        anticipationRate: entryAnt.toFixed(4),
        finalMdr: (mdrBase + entryAnt).toFixed(4),
        isManualOverride: false,
      };
    }
  }

  // Apply Amex → Hipercard if combined
  if (shouldCopyAmexToHiper) {
    for (const [inst, entry] of Object.entries(perBrand.amex)) {
      if (!perBrand.hipercard[Number(inst)]) {
        perBrand.hipercard[Number(inst)] = { ...(entry as MDREntry) };
      }
    }
    console.log('[parse-pdf] Copied amex → hipercard');
  }

  let matrix = createEmptyMatrix();
  for (const brand of BRANDS) {
    matrix = mergePartialMatrix(matrix, brand, perBrand[brand]);
  }

  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (header.chargebackFee > 0) fees.chargebackFee = header.chargebackFee.toFixed(2);

  console.log(`[parse-pdf] SUCCESS — ${rows.length} rows, confidence=${header.confidence}, provider=${usedProvider}`);

  return NextResponse.json({
    matrix,
    fees,
    confidence: header.confidence,
    missingData: [],
  });
}
