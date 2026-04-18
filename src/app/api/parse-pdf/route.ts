import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName, InstallmentNumber, MDREntry } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { preprocessForOCR } from '@/lib/ocr/preprocess';
import { ocrExtractTable } from '@/lib/ocr/extract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // seconds — needed for Tesseract init + OCR

const ACCEPTED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg',
  'image/png', 'image/webp', 'image/gif',
]);

function normalizeMime(m: string) {
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

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
  source: string; // 'ocr' | 'llm-<provider>'
};

type QualityReport = {
  valid: boolean;
  totalFilled: number;
  perBrand: Record<string, number>;
  reason?: string;
};

// ─── Quality check ────────────────────────────────────────────────────────────
// Only values > 0 count — treat 0 as "not read"

function checkQuality(parsed: ParsedTable): QualityReport {
  const perBrand: Record<string, number> = {};
  let totalFilled = 0;
  for (const brand of BRANDS) {
    const count = (parsed.table[brand] ?? []).filter(v => v != null && v > 0).length;
    perBrand[brand] = count;
    totalFilled += count;
  }
  const max = Math.max(...Object.values(perBrand));
  if (max < 2) return { valid: false, totalFilled, perBrand, reason: `max per brand=${max}` };
  if (totalFilled < 10) return { valid: false, totalFilled, perBrand, reason: `totalFilled=${totalFilled}` };
  return { valid: true, totalFilled, perBrand };
}

// ─── OCR PIPELINE ─────────────────────────────────────────────────────────────

async function runOCRPipeline(
  rawBuffer: Buffer,
  mimeType: string,
  logs: string[]
): Promise<{ result: ParsedTable | null; preprocessedBuffer: Buffer | null }> {
  const lg = (m: string) => { console.log(`[ocr-pipeline] ${m}`); logs.push(m); };

  if (mimeType === 'application/pdf') {
    lg('OCR pipeline: skipping for PDF (use vision LLM instead)');
    return { result: null, preprocessedBuffer: null };
  }

  // ── Preprocess ─────────────────────────────────────────────────────────────
  lg('Preprocessing image for OCR (upscale + normalize + sharpen)...');
  let preprocessed: Buffer = rawBuffer;
  try {
    const r = await preprocessForOCR(rawBuffer);
    preprocessed = r.buffer;
    lg(`Preprocess done: ${r.originalWidth}px → ${r.processedWidth}px (×${r.upscaleFactor})`);
  } catch (err) {
    lg(`Preprocess failed: ${err} — using raw buffer`);
  }

  // ── OCR ────────────────────────────────────────────────────────────────────
  let ocrResult: Awaited<ReturnType<typeof ocrExtractTable>>;
  try {
    ocrResult = await ocrExtractTable(preprocessed, logs);
  } catch (err) {
    lg(`OCR failed: ${err}`);
    return { result: null, preprocessedBuffer: preprocessed };
  }

  lg(`OCR raw text (first 600):\n${ocrResult.rawText.slice(0, 600)}`);
  lg(`OCR filled: ${ocrResult.filledTotal}/60`);

  if (ocrResult.filledTotal < 5) {
    lg('OCR result insufficient (< 5 cells) — skipping, but preprocessed image available for LLM');
    return { result: null, preprocessedBuffer: preprocessed };
  }

  return {
    result: {
      meta: {
        anticipation_rate: 0,
        rates_include_anticipation: false,
        combined_amex_hipercard: false,
        confidence: Math.min(95, ocrResult.confidence),
        chargeback_fee: 0,
      },
      table: ocrResult.table,
      source: 'ocr',
    },
    preprocessedBuffer: preprocessed,
  };
}

// ─── Vision LLM prompt (chain-of-thought) ─────────────────────────────────────
// Used as FALLBACK after OCR. Also reconciles metadata (anticipation rate, etc.)

const RECONCILE_PROMPT = `You are reading a Brazilian payment MDR proposal.

Your task:
1. Read the anticipation rate (Acréscimo / Antecipação) in the header text if present.
   Output: METADATA: anticipation_rate=X.XX includes_anticipation=true|false chargeback_fee=X.XX confidence=0-100

2. Read every row of the MDR table from 1x to 12x. For each row, output exactly:
ROW 1: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 2: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
...
ROW 12: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX

Rules:
- Use the actual decimal NUMBER visible in the cell (e.g. 2.69, not 0)
- If you cannot read a number clearly, write null — DO NOT write 0
- If a column does not exist, write null for all its rows
- If Amex and Hipercard share one column, write the same value for both`;

function parseChainOfThought(raw: string, logs: string[]): ParsedTable {
  const lg = (m: string) => logs.push(m);

  const rowPattern = /ROW\s+(\d+)\s*:\s*(.+)/gi;
  const readRows = new Map<number, Record<string, number | null>>();
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(raw)) !== null) {
    const rowNum = parseInt(match[1], 10);
    if (rowNum < 1 || rowNum > 12) continue;
    const brandValues: Record<string, number | null> = {};
    const kvPattern = /(\w+)\s*=\s*([\d.,]+|null)/gi;
    let kv: RegExpExecArray | null;
    while ((kv = kvPattern.exec(match[2])) !== null) {
      const key = kv[1].toLowerCase();
      const raw2 = kv[2].toLowerCase();
      const val = raw2 === 'null' ? null : parseFloat(raw2.replace(',', '.'));
      const brand = key === 'master' ? 'mastercard' : key === 'hiper' ? 'hipercard' : key;
      brandValues[brand] = (val == null || isNaN(val) || val === 0) ? null : val;
    }
    readRows.set(rowNum, brandValues);
  }

  lg(`LLM chain-of-thought rows: ${readRows.size}`);
  readRows.forEach((vals, n) => lg(`  ROW ${n}: ${JSON.stringify(vals)}`));

  // Metadata
  const metaMatch = raw.match(/METADATA:\s*(.+)/i);
  let antRate = 0, includesAnt = false, chargebackFee = 0, confidence = 60;
  if (metaMatch) {
    const s = metaMatch[1];
    const ex = (k: string) => {
      const m2 = s.match(new RegExp(`${k}\\s*=\\s*([\\d.,]+|true|false)`, 'i'));
      return m2 ? m2[1] : '';
    };
    antRate = parseFloat(ex('anticipation_rate').replace(',', '.')) || 0;
    includesAnt = ex('includes_anticipation').toLowerCase() === 'true';
    chargebackFee = parseFloat(ex('chargeback_fee').replace(',', '.')) || 0;
    confidence = parseInt(ex('confidence'), 10) || 60;
  }

  // JSON fallback
  let jsonTable: Record<string, BrandArray> | null = null;
  const jsonMatch = raw.match(/<json>\s*([\s\S]*?)\s*<\/json>/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed?.table) jsonTable = parsed.table;
      if (!metaMatch && parsed?.meta) {
        antRate = parsed.meta.anticipation_rate ?? 0;
        includesAnt = parsed.meta.rates_include_anticipation ?? false;
        chargebackFee = parsed.meta.chargeback_fee ?? 0;
        confidence = parsed.meta.confidence ?? 60;
      }
    } catch { /* ignored */ }
  }

  const brands = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];
  const table: Record<string, BrandArray> = {};

  // Merge chain-of-thought rows + JSON block:
  // ROW lines take priority per cell; JSON fills gaps (with 0 discarded as "unread")
  for (const brand of brands) {
    const arr: (number | null)[] = Array(12).fill(null);

    // First: apply JSON block values (lowest priority, 0 = unread → null)
    if (jsonTable && Array.isArray(jsonTable[brand])) {
      const src = jsonTable[brand];
      for (let i = 0; i < 12 && i < src.length; i++) {
        const v = src[i];
        arr[i] = (v != null && v !== 0) ? v : null;
      }
    }

    // Then: override with ROW lines (always preferred — model committed to a value)
    // Use ANY ROW lines present, even just 1 — never discard real reads for JSON zeros
    for (let i = 1; i <= 12; i++) {
      const row = readRows.get(i);
      if (row && brand in row) {
        // null from ROW line is also authoritative (explicitly unreadable)
        arr[i - 1] = row[brand];
      }
    }

    table[brand] = arr;
    const filled = arr.filter(v => v != null && v > 0).length;
    lg(`  ${brand}: ${filled}/12 — [${arr.map(v => v ?? 'null').join(', ')}]`);
  }

  if (table.amex.some(v => v != null) && table.hipercard.every(v => v == null)) {
    table.hipercard = [...table.amex];
    lg('Copied amex → hipercard');
  }

  return {
    meta: { anticipation_rate: antRate, rates_include_anticipation: includesAnt, combined_amex_hipercard: false, confidence, chargeback_fee: chargebackFee },
    table,
    source: 'llm',
  };
}

// ─── Vision LLM providers (fallback after OCR) ────────────────────────────────

async function callOpenAI(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a precise OCR engine. When you cannot read a number clearly, write null — never write 0 as a placeholder.' },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
          { type: 'text', text: RECONCILE_PROMPT },
        ],
      },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? '';
  const finish = response.choices[0]?.finish_reason;
  if (!raw) throw new Error('Empty OpenAI response');
  if (finish === 'length') throw new Error(`OpenAI truncated (finish_reason=length)`);
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
    { text: RECONCILE_PROMPT },
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
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: RECONCILE_PROMPT }] }],
    }),
  });
  if (!res.ok) throw new Error(`ANTHROPIC_${res.status}`);
  const json = await res.json();
  const raw = json.content?.[0]?.text ?? '';
  if (!raw) throw new Error('Empty Anthropic response');
  return raw;
}

// ─── Matrix builder ───────────────────────────────────────────────────────────

function buildMatrix(
  table: Record<string, BrandArray>,
  antRate: number,
  includesAnt: boolean,
  logs: string[]
) {
  const lg = (m: string) => logs.push(m);
  const perBrand: Record<BrandName, Partial<Record<InstallmentNumber, MDREntry>>> = {
    visa: {}, mastercard: {}, elo: {}, amex: {}, hipercard: {},
  };

  for (const brand of BRANDS) {
    const arr = table[brand] ?? [];
    let filled = 0;
    for (let i = 0; i < 12; i++) {
      const displayed = arr[i];
      // 0 is treated as "not read" — skip it
      if (displayed == null || displayed === 0) continue;

      const inst = (i + 1) as InstallmentNumber;
      let mdrBase = displayed;
      let entryAnt = 0;

      if (includesAnt && antRate > 0) {
        mdrBase = Math.round(Math.max(0, displayed - antRate) * 10000) / 10000;
        entryAnt = antRate;
      }

      perBrand[brand][inst] = {
        mdrBase: mdrBase.toFixed(4),
        anticipationRate: entryAnt.toFixed(4),
        finalMdr: (mdrBase + entryAnt).toFixed(4),
        isManualOverride: false,
      };
      filled++;
    }
    lg(`  ${brand}: ${filled}/12 filled`);
  }

  let matrix = createEmptyMatrix();
  for (const brand of BRANDS) {
    matrix = mergePartialMatrix(matrix, brand, perBrand[brand] as Parameters<typeof mergePartialMatrix>[2]);
  }
  return matrix;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const lg = (m: string) => { console.log(`[parse-pdf] ${m}`); logs.push(m); };

  console.log('ENV CHECK', {
    OPENAI:    process.env.OPENAI_API_KEY    ? 'OK' : 'MISSING',
    GEMINI:    process.env.GEMINI_API_KEY    ? 'OK' : 'MISSING',
    ANTHROPIC: process.env.ANTHROPIC_API_KEY ? 'OK' : 'MISSING',
  });

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
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const base64 = fileBuffer.toString('base64');
  lg(`File: ${file.name}, mime=${mimeType}, ${(file.size / 1024).toFixed(0)}KB, isPdf=${isPdf}`);

  // ── Debug: keep base64 of original for UI ─────────────────────────────────
  const originalImageB64 = !isPdf ? `data:${mimeType};base64,${base64.slice(0, 200)}…` : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: OCR PIPELINE (images only)
  // ═══════════════════════════════════════════════════════════════════════════
  let bestParsed: ParsedTable | null = null;
  let bestQuality: QualityReport | null = null;
  let preprocessedBuffer: Buffer | null = null; // reused for vision LLM

  if (!isPdf) {
    lg('=== STAGE 1: OCR pipeline ===');
    try {
      const { result: ocrResult, preprocessedBuffer: ppBuf } =
        await runOCRPipeline(fileBuffer, mimeType, logs);
      preprocessedBuffer = ppBuf; // always keep, even if OCR insufficient
      if (ocrResult) {
        const q = checkQuality(ocrResult);
        lg(`OCR quality: valid=${q.valid}, total=${q.totalFilled}, perBrand=${JSON.stringify(q.perBrand)}`);
        if (q.totalFilled > 0) {
          bestParsed = ocrResult;
          bestQuality = q;
          if (q.valid) {
            lg('OCR: ✓ accepted as final result (skipping vision LLM)');
          } else {
            lg(`OCR: partial (${q.totalFilled} cells) — will try vision LLM`);
          }
        }
      }
    } catch (err) {
      lg(`OCR stage error: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2: Vision LLM — run if OCR wasn't good enough
  // Send the PREPROCESSED image (3× upscaled, high-contrast PNG) to get better
  // cell-value reading from vision models, not the original compressed file.
  // ═══════════════════════════════════════════════════════════════════════════
  let bestRaw = '';
  let usedProvider = bestParsed?.source ?? '';

  const needsLLM = !bestQuality?.valid;

  if (needsLLM) {
    lg('=== STAGE 2: Vision LLM ===');

    // ── Provider availability check ──────────────────────────────────────────
    const hasOpenAI    = !!process.env.OPENAI_API_KEY;
    const hasGemini    = !!process.env.GEMINI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    lg(`Providers configured: OpenAI=${hasOpenAI}, Gemini=${hasGemini}, Anthropic=${hasAnthropic}`);

    if (!hasOpenAI && !hasGemini && !hasAnthropic) {
      return NextResponse.json({
        error: 'Nenhum provider de IA configurado. Configure OPENAI_API_KEY ou GEMINI_API_KEY no .env.local.',
        debug: { logs, preview: logs.join('\n') },
      }, { status: 503 });
    }

    // ── Build provider chain: OpenAI → Gemini → Anthropic (only if key set) ─
    const llmBuffer = (!isPdf && preprocessedBuffer) ? preprocessedBuffer : fileBuffer;
    const llmBase64 = llmBuffer.toString('base64');
    const llmMime   = (!isPdf && preprocessedBuffer) ? 'image/png' : mimeType;
    lg(`LLM input: ${llmMime}, ${(llmBuffer.length / 1024).toFixed(0)}KB`);

    const providers = [
      { name: 'OpenAI',    fn: () => callOpenAI(llmBase64, llmMime) },
      { name: 'Gemini',    fn: () => callGemini(llmBase64, llmMime) },
      ...(hasAnthropic
        ? [{ name: 'Anthropic', fn: () => callAnthropic(llmBase64, llmMime, isPdf) }]
        : []),
    ];
    lg(`Provider order: ${providers.map(p => p.name).join(' → ')}`);

    for (const provider of providers) {
      let raw: string;
      try {
        lg(`${provider.name}: calling...`);
        raw = await provider.fn();
        lg(`${provider.name}: ✓ ${raw.length} chars received`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'NO_KEY') { lg(`${provider.name}: skipped (key not set)`); continue; }
        lg(`${provider.name}: failed — ${msg}${providers.indexOf(provider) < providers.length - 1 ? ' → trying next provider' : ''}`);
        continue;
      }

      lg(`${provider.name} raw (first 500):\n${raw.slice(0, 500)}`);

      let parsed: ParsedTable;
      try {
        parsed = parseChainOfThought(raw, logs);
        parsed.source = `llm-${provider.name.toLowerCase()}`;
      } catch (err) {
        lg(`${provider.name}: parse error — ${err}`);
        continue;
      }

      const q = checkQuality(parsed);
      lg(`${provider.name}: quality valid=${q.valid}, total=${q.totalFilled}`);

      // Merge OCR table with LLM table: prefer whichever has more data per brand
      if (bestParsed && bestQuality) {
        lg('Merging OCR + LLM results (best per brand)...');
        const merged: Record<string, BrandArray> = {};
        for (const brand of BRANDS) {
          const ocrArr = bestParsed.table[brand] ?? Array(12).fill(null);
          const llmArr = parsed.table[brand] ?? Array(12).fill(null);
          const ocrCount = ocrArr.filter(v => v != null && v > 0).length;
          const llmCount = llmArr.filter(v => v != null && v > 0).length;
          merged[brand] = ocrCount >= llmCount ? ocrArr : llmArr;
          lg(`  ${brand}: OCR=${ocrCount} LLM=${llmCount} → using ${ocrCount >= llmCount ? 'OCR' : 'LLM'}`);
        }
        // Take metadata from LLM (more reliable for text fields)
        bestParsed = { ...parsed, table: merged, source: `ocr+llm-${provider.name.toLowerCase()}` };
        bestQuality = checkQuality(bestParsed);
      } else {
        // No prior OCR result — use LLM directly
        if (!bestParsed || q.totalFilled > (bestQuality?.totalFilled ?? 0)) {
          bestParsed = parsed;
          bestQuality = q;
          bestRaw = raw;
          usedProvider = parsed.source;
        }
      }

      bestRaw = raw;
      usedProvider = bestParsed.source;

      if (bestQuality?.valid) {
        lg(`${provider.name}: ✓ accepted`);
        break;
      }
      lg(`${provider.name}: partial, continuing...`);
    }
  }

  if (!bestParsed) {
    return NextResponse.json({
      error: 'Nenhum dado extraído. Verifique se as chaves de API (GEMINI_API_KEY / OPENAI_API_KEY) estão configuradas.',
      debug: { logs },
    }, { status: 503 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: Build MDR matrix
  // ═══════════════════════════════════════════════════════════════════════════
  lg('=== STAGE 3: Build matrix ===');
  const { meta, table } = bestParsed;
  const antRate = meta.anticipation_rate ?? 0;
  const includesAnt = meta.rates_include_anticipation && antRate > 0;
  lg(`antRate=${antRate}, includesAnt=${includesAnt}`);

  const matrix = buildMatrix(table, antRate, includesAnt, logs);

  // ── Proof: count what's in the final matrix ────────────────────────────────
  const finalCounts: Record<string, number> = {};
  for (const brand of BRANDS) {
    let c = 0;
    for (let i = 1; i <= 12; i++) {
      if (matrix[brand][i as InstallmentNumber]?.mdrBase) c++;
    }
    finalCounts[brand] = c;
  }
  lg(`Final matrix counts: ${JSON.stringify(finalCounts)}`);

  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (meta.chargeback_fee > 0) fees.chargebackFee = meta.chargeback_fee.toFixed(2);

  const isPartial = !bestQuality?.valid;

  const missingData: string[] = [];
  for (const brand of BRANDS) {
    const n = finalCounts[brand];
    if (n === 0) missingData.push(brand);
    else if (n < 12) missingData.push(`${brand} (${n}/12)`);
  }

  const confLabel: 'high' | 'medium' | 'low' =
    meta.confidence >= 80 ? 'high' : meta.confidence >= 50 ? 'medium' : 'low';

  lg(`DONE: source=${usedProvider}, partial=${isPartial}, confidence=${meta.confidence}`);

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
      quality: { totalFilled: Object.values(finalCounts).reduce((a, b) => a + b, 0), perBrand: finalCounts },
      rawFull: bestRaw,
      parsedTable: table,
      originalImageB64,
    },
  });
}
