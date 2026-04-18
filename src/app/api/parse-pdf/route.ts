import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import { MDREntry, InstallmentNumber } from '@/types/pricing';
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

// ─── Schema types (exact match with user spec) ─────────────────────────────

type BrandCell = { base: number | null; ant: number | null };

type ExtractedRow = {
  installments: number;
  visa: BrandCell;
  mastercard: BrandCell;
  elo: BrandCell;
  amex: BrandCell;
  hipercard: BrandCell;
};

type ExtractionResult = {
  confidence: number;            // 0-100
  source_type: 'pdf' | 'image';
  anticipation_label: string;
  global_anticipation_rate: number;
  rates_include_anticipation: boolean;
  combined_amex_hipercard_column: boolean;
  chargeback_fee: number;
  rows: ExtractedRow[];
};

// ─── Build the template prompt (12 rows pre-listed with null) ─────────────

function buildPrompt(sourceType: 'pdf' | 'image'): string {
  // Pre-generate all 12 rows as null — model fills in actual values
  const rowTemplate = Array.from({ length: 12 }, (_, i) =>
    `    {"installments":${String(i + 1).padStart(2)},"visa":{"base":null,"ant":null},"mastercard":{"base":null,"ant":null},"elo":{"base":null,"ant":null},"amex":{"base":null,"ant":null},"hipercard":{"base":null,"ant":null}}`
  ).join(',\n');

  return `You are a financial data extraction engine. Analyze this Brazilian payment proposal ${sourceType} and extract ALL MDR (Merchant Discount Rate) data.

Return ONLY valid JSON. No prose, no markdown, no code fences. Just the JSON object.

Fill in the exact template below by replacing null values with actual numbers from the document:

{
  "confidence": 0,
  "source_type": "${sourceType}",
  "anticipation_label": "",
  "global_anticipation_rate": 0,
  "rates_include_anticipation": false,
  "combined_amex_hipercard_column": false,
  "chargeback_fee": 0,
  "rows": [
${rowTemplate}
  ]
}

MANDATORY RULES — violation means extraction failure:

1. ROWS: You MUST fill all 12 rows (installments 1 through 12). Do not leave any row with all-null brand values if the document has that brand.

2. BASE vs ANT:
   - "base" = the base MDR rate for that installment/brand
   - "ant" = the anticipation rate component (often 0 if not split in document)
   - If the document shows only one combined rate column per brand, put that value in "base" and 0 in "ant"

3. RATES INCLUDE ANTICIPATION:
   - Look for header text like "Antecipação D+2 · Acréscimo de X,XX%" or "Taxa de antecipação: X%"
   - If the displayed rates ALREADY include the anticipation, set rates_include_anticipation=true and global_anticipation_rate=X.XX
   - In that case: the "base" value you fill in should be the displayed value minus global_anticipation_rate, and "ant" = global_anticipation_rate
   - Example: displayed 2.69%, anticipation=1.78% → base=0.91, ant=1.78

4. COMBINED COLUMN: If the document has a column labeled "Amex/Hiper/Outras" or "Amex/Hiper":
   - Set combined_amex_hipercard_column=true
   - Fill BOTH amex and hipercard with the same values from that column

5. NUMBER FORMAT: Use decimal dot not comma. "2.69" not "2,69". No % sign. Pure number.

6. NULL vs ZERO: Use null only when a brand is ABSENT from the document. Use 0.00 when the rate is genuinely zero.

7. CONFIDENCE: integer 0-100 reflecting how clearly you could read the data.

8. Do NOT stop reading after row 1. Read the ENTIRE table top to bottom.`;
}

// ─── Validate completeness of extraction ─────────────────────────────────

type ValidationResult = {
  valid: boolean;
  rowCount: number;
  filledBrands: number;
  filledCells: number;
  reason?: string;
};

function validateExtraction(result: ExtractionResult): ValidationResult {
  const rows = result.rows ?? [];
  const rowCount = rows.length;

  if (rowCount < 6) {
    return { valid: false, rowCount, filledBrands: 0, filledCells: 0, reason: `Only ${rowCount} rows returned (need at least 6)` };
  }

  const brands: (keyof ExtractedRow)[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];
  let filledCells = 0;
  const filledBrandSet = new Set<string>();

  for (const row of rows) {
    for (const brand of brands) {
      const cell = row[brand] as BrandCell;
      if (cell?.base != null && cell.base > 0) {
        filledCells++;
        filledBrandSet.add(brand as string);
      }
    }
  }

  if (filledCells < 6) {
    return { valid: false, rowCount, filledBrands: filledBrandSet.size, filledCells, reason: `Only ${filledCells} non-null cells found (need at least 6)` };
  }

  // Check that at least one brand has > 3 rows filled (not just 1x)
  const brandRowCounts: Record<string, number> = {};
  for (const row of rows) {
    for (const brand of brands) {
      const cell = row[brand] as BrandCell;
      if (cell?.base != null && cell.base > 0) {
        brandRowCounts[brand as string] = (brandRowCounts[brand as string] ?? 0) + 1;
      }
    }
  }

  const maxRows = Math.max(...Object.values(brandRowCounts), 0);
  if (maxRows < 3) {
    return { valid: false, rowCount, filledBrands: filledBrandSet.size, filledCells, reason: `Best brand only has ${maxRows} rows filled (need at least 3)` };
  }

  return { valid: true, rowCount, filledBrands: filledBrandSet.size, filledCells };
}

// ─── JSON extraction (strips fences, balanced brace parser) ───────────────

function extractJson(raw: string): ExtractionResult {
  let text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');

  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end === -1) throw new Error('Unclosed JSON object (likely truncated response)');

  const parsed = JSON.parse(text.slice(start, end + 1)) as ExtractionResult;

  if (!Array.isArray(parsed.rows)) throw new Error('Missing rows array in JSON');

  return parsed;
}

// ─── OpenAI call ──────────────────────────────────────────────────────────

async function callOpenAI(
  base64: string, mimeType: string, isPdf: boolean, log: (m: string) => void
): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  if (isPdf) throw new Error('PDF_UNSUPPORTED');

  log('OpenAI: sending request with gpt-4o + json_object mode');

  const client = new OpenAI({ apiKey });
  const prompt = buildPrompt('image');

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 3000,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a financial data extraction engine. You return only valid JSON. Never truncate your output.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  log(`OpenAI: received ${raw.length} chars, finish_reason=${response.choices[0]?.finish_reason}`);

  if (!raw) throw new Error('Empty response from OpenAI');

  return extractJson(raw);
}

// ─── Gemini call ──────────────────────────────────────────────────────────

async function callGemini(
  base64: string, mimeType: string, log: (m: string) => void
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  log('Gemini: sending request with gemini-1.5-flash');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0, maxOutputTokens: 3000 },
  });

  const prompt = buildPrompt(mimeType === 'application/pdf' ? 'pdf' : 'image');

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    { text: prompt },
  ]);

  const raw = result.response.text();
  log(`Gemini: received ${raw.length} chars`);

  if (!raw) throw new Error('Empty response from Gemini');

  return extractJson(raw);
}

// ─── Anthropic call ───────────────────────────────────────────────────────

async function callAnthropic(
  base64: string, mimeType: string, isPdf: boolean, log: (m: string) => void
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  log('Anthropic: sending request');

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
      max_tokens: 3000,
      messages: [
        { role: 'user', content: [fileBlock, { type: 'text', text: buildPrompt(isPdf ? 'pdf' : 'image') }] },
      ],
    }),
  });

  if (!res.ok) throw new Error(`ANTHROPIC_${res.status}: ${(await res.text()).slice(0, 200)}`);

  const json = await res.json();
  const raw = json.content?.[0]?.text ?? '';
  log(`Anthropic: received ${raw.length} chars`);

  if (!raw) throw new Error('Empty response from Anthropic');

  return extractJson(raw);
}

// ─── Main handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[parse-pdf] ${msg}`);
    logs.push(msg);
  };

  // 1. Parse form data
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

  log(`File: ${file.name}, mime=${mimeType}, size=${(file.size / 1024).toFixed(0)}KB`);

  // 2. Define provider order — OpenAI first for images (better table reading)
  type ProviderCall = () => Promise<ExtractionResult>;

  const providerList: Array<{ name: string; fn: ProviderCall }> = isPdf
    ? [
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType, log) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf, log) },
      ]
    : [
        { name: 'OpenAI',    fn: () => callOpenAI(base64, mimeType, isPdf, log) },
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType, log) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf, log) },
      ];

  // 3. Try each provider, validate, fallback if incomplete
  let bestResult: ExtractionResult | null = null;
  let bestValidation: ValidationResult | null = null;
  let usedProvider = '';
  const providerErrors: string[] = [];

  for (const provider of providerList) {
    let result: ExtractionResult;

    try {
      result = await provider.fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_KEY' || msg === 'PDF_UNSUPPORTED') {
        log(`${provider.name}: skipped (${msg})`);
        continue;
      }
      log(`${provider.name}: call failed — ${msg}`);
      providerErrors.push(`${provider.name}: ${msg}`);
      continue;
    }

    const validation = validateExtraction(result);
    log(
      `${provider.name}: rows=${validation.rowCount}, filledCells=${validation.filledCells}, brands=${validation.filledBrands}, valid=${validation.valid}${validation.reason ? ` (${validation.reason})` : ''}`
    );

    if (validation.valid) {
      bestResult = result;
      bestValidation = validation;
      usedProvider = provider.name;
      log(`${provider.name}: accepted as final result`);
      break;
    }

    // Keep best partial result for potential use if all providers fail
    if (!bestResult || validation.filledCells > (bestValidation?.filledCells ?? 0)) {
      bestResult = result;
      bestValidation = validation;
      usedProvider = provider.name;
      log(`${provider.name}: partial result saved (${validation.filledCells} cells)`);
    }

    // Try next provider
  }

  if (!bestResult) {
    return NextResponse.json(
      {
        error: 'Nenhum provider conseguiu extrair dados. ' + (providerErrors.join('; ') || 'Configure GEMINI_API_KEY ou OPENAI_API_KEY.'),
        debug: { logs },
      },
      { status: 503 }
    );
  }

  // Warn if partial result
  const isPartial = !bestValidation?.valid;
  if (isPartial) {
    log(`WARNING: Using partial result from ${usedProvider} (${bestValidation?.filledCells ?? 0} cells)`);
  }

  // 4. Apply combined amex/hipercard logic
  const shouldCopyAmexToHiper =
    bestResult.combined_amex_hipercard_column ||
    (bestResult.rows.some(r => r.amex.base != null) && bestResult.rows.every(r => r.hipercard.base == null));

  if (shouldCopyAmexToHiper) {
    for (const row of bestResult.rows) {
      if (row.amex.base != null && row.hipercard.base == null) {
        row.hipercard = { ...row.amex };
      }
    }
    log('Applied amex → hipercard copy (combined column)');
  }

  // 5. Build MDR matrix
  const antRate = bestResult.global_anticipation_rate ?? 0;
  const includesAnt = bestResult.rates_include_anticipation && antRate > 0;

  const perBrand: Record<BrandName, Partial<Record<InstallmentNumber, MDREntry>>> = {
    visa: {}, mastercard: {}, elo: {}, amex: {}, hipercard: {},
  };

  const brandKeys: Array<keyof ExtractedRow & BrandName> = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];

  for (const row of bestResult.rows) {
    const inst = row.installments as InstallmentNumber;
    if (inst < 1 || inst > 12) continue;

    for (const brand of brandKeys) {
      const cell = row[brand] as BrandCell;
      if (cell == null || cell.base == null) continue;

      let mdrBase: number;
      let entryAnt: number;

      if (includesAnt) {
        // Subtract global anticipation to recover base rate
        mdrBase = Math.round(Math.max(0, cell.base - antRate) * 10000) / 10000;
        entryAnt = antRate;
      } else if (cell.ant != null && cell.ant > 0) {
        mdrBase = cell.base;
        entryAnt = cell.ant;
      } else {
        mdrBase = cell.base;
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

  // 6. Compose fees
  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (bestResult.chargeback_fee > 0) fees.chargebackFee = bestResult.chargeback_fee.toFixed(2);

  // 7. Count filled rows for missingData report
  const missingData: string[] = [];
  for (const brand of brandKeys) {
    const filledCount = bestResult.rows.filter(r => (r[brand] as BrandCell)?.base != null).length;
    if (filledCount === 0) missingData.push(brand);
    else if (filledCount < 12) missingData.push(`${brand} (parcial: ${filledCount}/12)`);
  }

  // Map confidence 0-100 → string
  const confNum = bestResult.confidence ?? 0;
  const confLabel: 'high' | 'medium' | 'low' =
    confNum >= 80 ? 'high' : confNum >= 50 ? 'medium' : 'low';

  log(`Done. provider=${usedProvider}, partial=${isPartial}, confidence=${confNum}, fees=${JSON.stringify(fees)}`);

  return NextResponse.json({
    matrix,
    fees,
    confidence: confLabel,
    confidenceScore: confNum,
    missingData,
    partial: isPartial,
    debug: { logs, provider: usedProvider },
  });
}
