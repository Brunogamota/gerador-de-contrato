import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import { MDREntry } from '@/types/pricing';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACCEPTED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg',
  'image/png', 'image/webp', 'image/gif',
]);

function normalizeMime(m: string) {
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

// ─── Schema: flat array per brand (12 elements, index = installment-1) ───────

type BrandArray = (number | null)[];  // length 12, index 0 = 1x, index 11 = 12x

type FlatResult = {
  meta: {
    anticipation_rate: number;
    rates_include_anticipation: boolean;
    combined_amex_hipercard: boolean;
    confidence: number;       // 0-100
    chargeback_fee: number;
    missing_brands: string[];
  };
  table: {
    visa: BrandArray;
    mastercard: BrandArray;
    elo: BrandArray;
    amex: BrandArray;
    hipercard: BrandArray;
  };
};

// ─── Prompt ────────────────────────────────────────────────────────────────

const NULL_ARRAY = '[null,null,null,null,null,null,null,null,null,null,null,null]';

const PARSE_PROMPT = `You are an OCR engine extracting an MDR rate table from a Brazilian payment proposal.

Return ONLY valid JSON with NO prose, NO markdown, NO code fences. Just the raw JSON:

{
  "meta": {
    "anticipation_rate": 0,
    "rates_include_anticipation": false,
    "combined_amex_hipercard": false,
    "confidence": 0,
    "chargeback_fee": 0,
    "missing_brands": []
  },
  "table": {
    "visa":       ${NULL_ARRAY},
    "mastercard": ${NULL_ARRAY},
    "elo":        ${NULL_ARRAY},
    "amex":       ${NULL_ARRAY},
    "hipercard":  ${NULL_ARRAY}
  }
}

INSTRUCTIONS:

Each brand array has exactly 12 positions: index 0 = 1x, index 1 = 2x, ..., index 11 = 12x.
Fill each position with the EXACT percentage number shown in that row/column of the table.

HOW TO FILL:
- Read the table column by column (one per brand)
- For each brand column, read all 12 rows from top (1x) to bottom (12x)
- Place each value at the correct index: 1x → index 0, 2x → index 1, etc.
- Example: if Visa row 1x=2.69, row 2x=3.05, row 3x=3.95... → "visa":[2.69,3.05,3.95,...]
- Use decimal dot: 2.69 not 2,69 and not "2.69%"
- Use null ONLY for a brand column that does not exist in the document at all

META FIELDS:
- anticipation_rate: look for "Acréscimo de X,XX%" near the table title. Extract X.XX as a number.
- rates_include_anticipation: true if the table header says rates include anticipation (e.g. "Antecipação D+2 · Acréscimo de 1,78%")
  When true: the displayed values already contain the anticipation. base = displayed - anticipation_rate
- combined_amex_hipercard: true if a SINGLE column covers Amex AND Hipercard (e.g. "Amex/Hiper/Outras")
  When true: fill BOTH amex and hipercard arrays with the same values from that column
- confidence: 0-100, how clearly you read the data
- missing_brands: list brand names that had no column in the document

CRITICAL: The result MUST contain all 12 values per brand that exists in the document.
Do not stop at row 1. Read all rows top to bottom.`;

// ─── Validate extraction quality ────────────────────────────────────────────

type QualityReport = {
  valid: boolean;
  totalFilled: number;
  perBrand: Record<string, number>;
  reason?: string;
};

function assessQuality(result: FlatResult): QualityReport {
  const brands = Object.keys(result.table) as (keyof typeof result.table)[];
  const perBrand: Record<string, number> = {};
  let totalFilled = 0;

  for (const brand of brands) {
    const arr = result.table[brand] ?? [];
    const count = arr.filter(v => v != null && v > 0).length;
    perBrand[brand] = count;
    totalFilled += count;
  }

  const maxPerBrand = Math.max(...Object.values(perBrand));

  if (totalFilled < 6) {
    return { valid: false, totalFilled, perBrand, reason: `Only ${totalFilled} non-null values total` };
  }
  if (maxPerBrand < 3) {
    return { valid: false, totalFilled, perBrand, reason: `Best brand only has ${maxPerBrand}/12 rows` };
  }
  if (maxPerBrand === 1) {
    return { valid: false, totalFilled, perBrand, reason: 'Only 1x row filled — AI read only the header row' };
  }

  return { valid: true, totalFilled, perBrand };
}

// ─── Robust JSON extraction ─────────────────────────────────────────────────

function extractJson(raw: string): FlatResult {
  // Strip markdown fences
  let text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  const start = text.indexOf('{');
  if (start === -1) throw new Error('No { found in response');

  // Balanced-brace walk
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error(`Unbalanced JSON — response likely truncated (got ${text.length} chars)`);

  const parsed = JSON.parse(text.slice(start, end + 1)) as FlatResult;
  if (!parsed.table) throw new Error('Missing table field');
  if (!parsed.meta) throw new Error('Missing meta field');

  // Ensure all arrays are length 12
  for (const brand of ['visa', 'mastercard', 'elo', 'amex', 'hipercard'] as const) {
    if (!Array.isArray(parsed.table[brand])) {
      parsed.table[brand] = Array(12).fill(null);
    } else {
      // Pad/trim to 12
      while (parsed.table[brand].length < 12) parsed.table[brand].push(null);
      parsed.table[brand] = parsed.table[brand].slice(0, 12);
    }
  }

  return parsed;
}

// ─── Providers ──────────────────────────────────────────────────────────────

async function callOpenAI(base64: string, mimeType: string, isPdf: boolean): Promise<{ raw: string; result: FlatResult }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  if (isPdf) throw new Error('PDF_UNSUPPORTED');

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a table OCR engine. Return only valid JSON. Never truncate. Fill all 12 values per brand.',
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
          { type: 'text', text: PARSE_PROMPT },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const finishReason = response.choices[0]?.finish_reason;
  if (!raw) throw new Error('Empty OpenAI response');
  if (finishReason === 'length') throw new Error('OpenAI response truncated (finish_reason=length)');

  return { raw, result: extractJson(raw) };
}

async function callGemini(base64: string, mimeType: string): Promise<{ raw: string; result: FlatResult }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0, maxOutputTokens: 4096 },
  });

  const aiResult = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    { text: PARSE_PROMPT },
  ]);

  const raw = aiResult.response.text();
  if (!raw) throw new Error('Empty Gemini response');

  return { raw, result: extractJson(raw) };
}

async function callAnthropic(base64: string, mimeType: string, isPdf: boolean): Promise<{ raw: string; result: FlatResult }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  type Block =
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
    | { type: 'text'; text: string };

  const fileBlock: Block = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      ...(isPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: PARSE_PROMPT }] }],
    }),
  });

  if (!res.ok) throw new Error(`ANTHROPIC_${res.status}: ${(await res.text()).slice(0, 200)}`);

  const json = await res.json();
  const raw = json.content?.[0]?.text ?? '';
  if (!raw) throw new Error('Empty Anthropic response');

  return { raw, result: extractJson(raw) };
}

// ─── Main handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const lg = (m: string) => { console.log(`[parse-pdf] ${m}`); logs.push(m); };

  // 1. Read file
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
    return NextResponse.json({ error: `Tipo não suportado: ${rawMime}.` }, { status: 415 });
  }

  const isPdf = mimeType === 'application/pdf';
  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
  lg(`File: ${file.name}, mime=${mimeType}, size=${(file.size / 1024).toFixed(0)}KB`);

  // 2. Provider calls with quality validation and fallback
  type ProviderResult = { raw: string; result: FlatResult };
  type ProviderDef = { name: string; fn: () => Promise<ProviderResult> };

  const providers: ProviderDef[] = isPdf
    ? [
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
      ]
    : [
        { name: 'OpenAI',    fn: () => callOpenAI(base64, mimeType, isPdf) },
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
      ];

  let bestResult: FlatResult | null = null;
  let bestQuality: QualityReport | null = null;
  let bestRaw = '';
  let usedProvider = '';
  const providerErrors: string[] = [];

  for (const provider of providers) {
    let providerResult: ProviderResult;

    try {
      lg(`${provider.name}: calling...`);
      providerResult = await provider.fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_KEY' || msg === 'PDF_UNSUPPORTED') {
        lg(`${provider.name}: skipped (${msg})`);
        continue;
      }
      lg(`${provider.name}: ERROR — ${msg}`);
      providerErrors.push(`${provider.name}: ${msg}`);
      continue;
    }

    const quality = assessQuality(providerResult.result);
    lg(`${provider.name}: raw=${providerResult.raw.length}chars, totalFilled=${quality.totalFilled}, perBrand=${JSON.stringify(quality.perBrand)}, valid=${quality.valid}${quality.reason ? ` (${quality.reason})` : ''}`);

    if (quality.valid) {
      bestResult = providerResult.result;
      bestQuality = quality;
      bestRaw = providerResult.raw;
      usedProvider = provider.name;
      lg(`${provider.name}: ✓ accepted`);
      break;
    }

    // Keep best partial result
    if (!bestResult || quality.totalFilled > (bestQuality?.totalFilled ?? 0)) {
      bestResult = providerResult.result;
      bestQuality = quality;
      bestRaw = providerResult.raw;
      usedProvider = provider.name;
      lg(`${provider.name}: partial result saved (better than previous)`);
    }
  }

  if (!bestResult) {
    return NextResponse.json(
      { error: 'Nenhum provider retornou dados. ' + (providerErrors.join('; ') || 'Verifique as chaves de API.'), debug: { logs } },
      { status: 503 }
    );
  }

  const isPartial = !bestQuality?.valid;
  lg(`Final: provider=${usedProvider}, partial=${isPartial}, totalFilled=${bestQuality?.totalFilled}`);

  // 3. Apply combined amex/hipercard
  const meta = bestResult.meta;
  const table = bestResult.table;

  if (meta.combined_amex_hipercard || (table.amex.some(v => v != null) && table.hipercard.every(v => v == null))) {
    table.hipercard = [...table.amex];
    lg('Copied amex → hipercard (combined column)');
  }

  // 4. Build MDR matrix
  const antRate = meta.anticipation_rate ?? 0;
  const includesAnt = meta.rates_include_anticipation && antRate > 0;

  const perBrand: Record<BrandName, Partial<Record<InstallmentNumber, MDREntry>>> = {
    visa: {}, mastercard: {}, elo: {}, amex: {}, hipercard: {},
  };

  for (const brand of BRANDS) {
    const arr = table[brand];
    if (!arr) continue;

    for (let i = 0; i < 12; i++) {
      const displayed = arr[i];
      if (displayed == null) continue;

      const inst = (i + 1) as InstallmentNumber;

      let mdrBase: number;
      let entryAnt: number;

      if (includesAnt) {
        mdrBase = Math.round(Math.max(0, displayed - antRate) * 10000) / 10000;
        entryAnt = antRate;
      } else {
        mdrBase = displayed;
        entryAnt = 0;
      }

      perBrand[brand][inst] = {
        mdrBase: mdrBase.toFixed(4),
        anticipationRate: entryAnt.toFixed(4),
        finalMdr: (mdrBase + entryAnt).toFixed(4),
        isManualOverride: false,
      };
    }
  }

  let matrix = createEmptyMatrix();
  for (const brand of BRANDS) {
    matrix = mergePartialMatrix(matrix, brand, perBrand[brand] as Parameters<typeof mergePartialMatrix>[2]);
  }

  // 5. Fees
  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (meta.chargeback_fee > 0) fees.chargebackFee = meta.chargeback_fee.toFixed(2);

  // 6. Missing data report
  const missingData: string[] = [];
  for (const brand of BRANDS) {
    const filled = bestQuality?.perBrand[brand] ?? 0;
    if (filled === 0) missingData.push(brand);
    else if (filled < 12) missingData.push(`${brand} (${filled}/12)`);
  }

  const confNum = meta.confidence ?? 0;
  const confLabel: 'high' | 'medium' | 'low' = confNum >= 80 ? 'high' : confNum >= 50 ? 'medium' : 'low';

  lg(`Done. confidence=${confNum}, fees=${JSON.stringify(fees)}, missing=${JSON.stringify(missingData)}`);

  return NextResponse.json({
    matrix,
    fees,
    confidence: confLabel,
    confidenceScore: confNum,
    missingData,
    partial: isPartial,
    debug: {
      logs,
      provider: usedProvider,
      quality: bestQuality,
      rawPreview: bestRaw.slice(0, 3000),
    },
  });
}
