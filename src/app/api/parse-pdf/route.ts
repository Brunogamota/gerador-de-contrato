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

// ─── Types ────────────────────────────────────────────────────────────────────

type BrandArray = (number | null)[];

type ParsedTable = {
  meta: {
    anticipation_rate: number;
    rates_include_anticipation: boolean;
    combined_amex_hipercard: boolean;
    confidence: number;
    chargeback_fee: number;
  };
  table: Record<string, BrandArray>;
};

// ─── Chain-of-thought prompt ──────────────────────────────────────────────────
// Forces model to read row-by-row BEFORE outputting JSON.
// This is the only reliable way to get all 12 rows from vision models.

const PARSE_PROMPT = `You are reading a Brazilian payment proposal image to extract an MDR rate table.

Follow these steps in order:

## STEP 1 — Read the table header
Identify each brand column (Visa, Master/Mastercard, Elo, Amex, Hipercard, or combined "Amex/Hiper/Outras").
Also look for anticipation rate text near the title, like "Antecipação D+2 · Acréscimo de 1,78%".

## STEP 2 — Read every row from top to bottom
For EACH installment row from 1x to 12x, write one line in this format:
ROW 1: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 2: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 3: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 4: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 5: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 6: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 7: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 8: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 9: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 10: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 11: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 12: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX

Rules:
- Replace X.XX with the actual decimal number from the image (use dot, not comma: 2.69 not 2,69)
- If a brand column does not exist, write null for that brand
- If "Amex/Hiper/Outras" is a single combined column, use the same value for both amex and hiper

## STEP 3 — Output metadata line
METADATA: anticipation_rate=X.XX includes_anticipation=true|false combined_amex_hiper=true|false chargeback_fee=X.XX confidence=0-100

## STEP 4 — Output JSON between <json> tags
<json>
{"meta":{"anticipation_rate":0,"rates_include_anticipation":false,"combined_amex_hipercard":false,"confidence":0,"chargeback_fee":0},"table":{"visa":[v1,v2,v3,v4,v5,v6,v7,v8,v9,v10,v11,v12],"mastercard":[...],"elo":[...],"amex":[...],"hipercard":[...]}}
</json>

The JSON must use the values you listed in Step 2. Arrays must have exactly 12 values each.`;

// ─── Response parser ──────────────────────────────────────────────────────────

function parseChainOfThought(raw: string, logs: string[]): ParsedTable {
  const lg = (m: string) => logs.push(m);

  // ── Extract ROW lines (chain-of-thought section) ─────────────────────────
  const rowPattern = /ROW\s+(\d+)\s*:\s*(.+)/gi;
  const readRows: Map<number, Record<string, number | null>> = new Map();
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(raw)) !== null) {
    const rowNum = parseInt(match[1], 10);
    if (rowNum < 1 || rowNum > 12) continue;

    const valueStr = match[2];
    const brandValues: Record<string, number | null> = {};

    // Parse key=value pairs on this line
    const kvPattern = /(\w+)\s*=\s*([\d.,]+|null)/gi;
    let kv: RegExpExecArray | null;
    while ((kv = kvPattern.exec(valueStr)) !== null) {
      const key = kv[1].toLowerCase();
      const val = kv[2].toLowerCase() === 'null' ? null : parseFloat(kv[2].replace(',', '.'));
      // Normalize brand aliases
      const brand = key === 'master' ? 'mastercard' : key === 'hiper' ? 'hipercard' : key;
      brandValues[brand] = isNaN(val as number) ? null : val;
    }
    readRows.set(rowNum, brandValues);
  }

  lg(`Chain-of-thought rows found: ${readRows.size} (expected 12)`);
  if (readRows.size > 0) {
    readRows.forEach((vals, rowNum) => {
      lg(`  ROW ${rowNum}: ${JSON.stringify(vals)}`);
    });
  }

  // ── Extract metadata line ─────────────────────────────────────────────────
  const metaPattern = /METADATA:\s*(.+)/i;
  const metaMatch = raw.match(metaPattern);
  let antRate = 0;
  let includesAnt = false;
  let combinedAmexHiper = false;
  let chargebackFee = 0;
  let confidence = 70;

  if (metaMatch) {
    const metaStr = metaMatch[1];
    const extract = (key: string) => {
      const m = metaStr.match(new RegExp(`${key}\\s*=\\s*([\\d.,]+|true|false)`, 'i'));
      return m ? m[1] : '';
    };
    antRate = parseFloat(extract('anticipation_rate').replace(',', '.')) || 0;
    includesAnt = extract('includes_anticipation').toLowerCase() === 'true';
    combinedAmexHiper = extract('combined_amex_hiper').toLowerCase() === 'true';
    chargebackFee = parseFloat(extract('chargeback_fee').replace(',', '.')) || 0;
    confidence = parseInt(extract('confidence'), 10) || 70;
    lg(`Metadata: antRate=${antRate}, includesAnt=${includesAnt}, combined=${combinedAmexHiper}, confidence=${confidence}`);
  }

  // ── Try to extract <json> block as well (use as supplementary data) ───────
  let jsonTable: Record<string, BrandArray> | null = null;
  const jsonBlockMatch = raw.match(/<json>\s*([\s\S]*?)\s*<\/json>/i);
  if (jsonBlockMatch) {
    try {
      const jsonStr = jsonBlockMatch[1].trim();
      const jsonParsed = JSON.parse(jsonStr);
      if (jsonParsed?.table) {
        jsonTable = jsonParsed.table;
        lg(`JSON block parsed: ${JSON.stringify(Object.fromEntries(Object.entries(jsonTable!).map(([k, v]) => [k, v.length])))}`);
      }
      // Also extract meta from JSON if metadata line wasn't found
      if (!metaMatch && jsonParsed?.meta) {
        antRate = jsonParsed.meta.anticipation_rate ?? 0;
        includesAnt = jsonParsed.meta.rates_include_anticipation ?? false;
        combinedAmexHiper = jsonParsed.meta.combined_amex_hipercard ?? false;
        chargebackFee = jsonParsed.meta.chargeback_fee ?? 0;
        confidence = jsonParsed.meta.confidence ?? 70;
      }
    } catch (e) {
      lg(`JSON block parse failed: ${e}`);
    }
  }

  // ── Build final table ─────────────────────────────────────────────────────
  // Priority: chain-of-thought rows > JSON block
  const brands = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];
  const table: Record<string, BrandArray> = {};

  for (const brand of brands) {
    const arr: (number | null)[] = Array(12).fill(null);

    if (readRows.size >= 6) {
      // Use chain-of-thought data (most reliable)
      for (let inst = 1; inst <= 12; inst++) {
        const rowData = readRows.get(inst) ?? null;
        if (rowData && brand in rowData) {
          arr[inst - 1] = rowData[brand];
        }
      }
    } else if (jsonTable && Array.isArray(jsonTable[brand])) {
      // Fall back to JSON block
      const src = jsonTable[brand];
      for (let i = 0; i < 12 && i < src.length; i++) {
        arr[i] = src[i];
      }
    }

    table[brand] = arr;
    lg(`  ${brand}: [${arr.map(v => v ?? 'null').join(', ')}]`);
  }

  // If combined amex/hiper column, ensure hipercard matches amex
  if (combinedAmexHiper || (table.amex.some(v => v != null) && table.hipercard.every(v => v == null))) {
    table.hipercard = [...table.amex];
    lg('Copied amex → hipercard (combined column)');
  }

  return {
    meta: { anticipation_rate: antRate, rates_include_anticipation: includesAnt, combined_amex_hipercard: combinedAmexHiper, confidence, chargeback_fee: chargebackFee },
    table,
  };
}

// ─── Quality check ────────────────────────────────────────────────────────────

type QualityReport = { valid: boolean; totalFilled: number; perBrand: Record<string, number>; reason?: string };

function checkQuality(parsed: ParsedTable): QualityReport {
  const perBrand: Record<string, number> = {};
  let totalFilled = 0;
  for (const brand of BRANDS) {
    const count = (parsed.table[brand] ?? []).filter(v => v != null && v > 0).length;
    perBrand[brand] = count;
    totalFilled += count;
  }
  const max = Math.max(...Object.values(perBrand));
  if (max < 2) return { valid: false, totalFilled, perBrand, reason: `Max rows per brand=${max}` };
  if (totalFilled < 10) return { valid: false, totalFilled, perBrand, reason: `totalFilled=${totalFilled}` };
  return { valid: true, totalFilled, perBrand };
}

// ─── Provider calls ───────────────────────────────────────────────────────────

async function callOpenAI(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const client = new OpenAI({ apiKey });

  // NO json_object mode — we need the chain-of-thought text
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'You are a precise OCR engine. Follow the steps exactly. Do not skip any row.',
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
  const finish = response.choices[0]?.finish_reason;
  if (!raw) throw new Error('Empty OpenAI response');
  if (finish === 'length') throw new Error(`OpenAI truncated (finish_reason=length) — got ${raw.length} chars`);
  return raw;
}

async function callGemini(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0, maxOutputTokens: 4096 },
  });

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    { text: PARSE_PROMPT },
  ]);

  const raw = result.response.text();
  if (!raw) throw new Error('Empty Gemini response');
  return raw;
}

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

  if (!res.ok) throw new Error(`ANTHROPIC_${res.status}`);
  const json = await res.json();
  const raw = json.content?.[0]?.text ?? '';
  if (!raw) throw new Error('Empty Anthropic response');
  return raw;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const lg = (m: string) => { console.log(`[parse-pdf] ${m}`); logs.push(m); };

  let file: File | null = null;
  try {
    const fd = await req.formData();
    file = fd.get('file') as File | null;
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
  lg(`File: ${file.name}, mime=${mimeType}, ${(file.size / 1024).toFixed(0)}KB`);

  // Provider order: OpenAI first for images (better vision), Gemini first for PDFs
  const providers = isPdf
    ? [
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
      ]
    : [
        { name: 'OpenAI',    fn: () => callOpenAI(base64, mimeType) },
        { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
        { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
      ];

  let bestParsed: ParsedTable | null = null;
  let bestQuality: QualityReport | null = null;
  let bestRaw = '';
  let usedProvider = '';

  for (const provider of providers) {
    let raw: string;
    try {
      lg(`${provider.name}: calling...`);
      raw = await provider.fn();
      lg(`${provider.name}: got ${raw.length} chars`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_KEY' || msg === 'PDF_UNSUPPORTED') { lg(`${provider.name}: skipped (${msg})`); continue; }
      lg(`${provider.name}: ERROR — ${msg}`);
      continue;
    }

    lg(`${provider.name} raw (first 500): ${raw.slice(0, 500)}`);

    let parsed: ParsedTable;
    try {
      parsed = parseChainOfThought(raw, logs);
    } catch (e) {
      lg(`${provider.name}: parse error — ${e}`);
      continue;
    }

    const quality = checkQuality(parsed);
    lg(`${provider.name}: quality — valid=${quality.valid}, total=${quality.totalFilled}, perBrand=${JSON.stringify(quality.perBrand)}${quality.reason ? ` (${quality.reason})` : ''}`);

    if (quality.valid) {
      bestParsed = parsed;
      bestQuality = quality;
      bestRaw = raw;
      usedProvider = provider.name;
      lg(`${provider.name}: ✓ accepted as final result`);
      break;
    }

    if (!bestParsed || quality.totalFilled > (bestQuality?.totalFilled ?? 0)) {
      bestParsed = parsed;
      bestQuality = quality;
      bestRaw = raw;
      usedProvider = provider.name;
      lg(`${provider.name}: partial result kept (${quality.totalFilled} cells)`);
    }
  }

  if (!bestParsed) {
    return NextResponse.json({ error: 'Nenhum provider retornou dados válidos. Verifique as chaves de API.', debug: { logs } }, { status: 503 });
  }

  const isPartial = !bestQuality?.valid;

  // ── Build MDR matrix ──────────────────────────────────────────────────────
  const { meta, table } = bestParsed;
  const antRate = meta.anticipation_rate ?? 0;
  const includesAnt = meta.rates_include_anticipation && antRate > 0;

  lg(`Building matrix: includesAnt=${includesAnt}, antRate=${antRate}`);

  const perBrand: Record<BrandName, Partial<Record<InstallmentNumber, MDREntry>>> = {
    visa: {}, mastercard: {}, elo: {}, amex: {}, hipercard: {},
  };

  for (const brand of BRANDS) {
    const arr = table[brand] ?? [];
    for (let i = 0; i < 12; i++) {
      const displayed = arr[i];
      if (displayed == null) continue;

      const inst = (i + 1) as InstallmentNumber;
      let mdrBase = displayed;
      let entryAnt = 0;

      if (includesAnt) {
        mdrBase = Math.round(Math.max(0, displayed - antRate) * 10000) / 10000;
        entryAnt = antRate;
      }

      perBrand[brand][inst] = {
        mdrBase: mdrBase.toFixed(4),
        anticipationRate: entryAnt.toFixed(4),
        finalMdr: (mdrBase + entryAnt).toFixed(4),
        isManualOverride: false,
      };
    }
    const filledCount = Object.keys(perBrand[brand]).length;
    lg(`  ${brand}: ${filledCount}/12 installments filled`);
  }

  let matrix = createEmptyMatrix();
  for (const brand of BRANDS) {
    matrix = mergePartialMatrix(matrix, brand, perBrand[brand] as Parameters<typeof mergePartialMatrix>[2]);
  }

  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (meta.chargeback_fee > 0) fees.chargebackFee = meta.chargeback_fee.toFixed(2);

  const missingData: string[] = [];
  for (const brand of BRANDS) {
    const filled = bestQuality?.perBrand[brand] ?? 0;
    if (filled === 0) missingData.push(brand);
    else if (filled < 12) missingData.push(`${brand} (${filled}/12)`);
  }

  const confLabel: 'high' | 'medium' | 'low' =
    meta.confidence >= 80 ? 'high' : meta.confidence >= 50 ? 'medium' : 'low';

  lg(`DONE: provider=${usedProvider}, partial=${isPartial}, confidence=${meta.confidence}`);

  return NextResponse.json({
    matrix,
    fees,
    confidence: confLabel,
    confidenceScore: meta.confidence,
    missingData,
    partial: isPartial,
    debug: {
      logs,
      provider: usedProvider,
      quality: bestQuality,
      rawFull: bestRaw,              // COMPLETE raw AI response, no truncation
      parsedTable: bestParsed.table, // Parsed arrays before matrix conversion
    },
  });
}
