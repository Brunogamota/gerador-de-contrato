import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName, InstallmentNumber, MDREntry } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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
  source: string;
};

type QualityReport = {
  valid: boolean;
  totalFilled: number;
  perBrand: Record<string, number>;
  reason?: string;
};

// ─── Quality check ────────────────────────────────────────────────────────────

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

// ─── Prompt ───────────────────────────────────────────────────────────────────

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

// ─── Parser ───────────────────────────────────────────────────────────────────

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

  lg(`LLM rows parsed: ${readRows.size}`);

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

  for (const brand of brands) {
    const arr: (number | null)[] = Array(12).fill(null);

    if (jsonTable && Array.isArray(jsonTable[brand])) {
      const src = jsonTable[brand];
      for (let i = 0; i < 12 && i < src.length; i++) {
        const v = src[i];
        arr[i] = (v != null && v !== 0) ? v : null;
      }
    }

    for (let i = 1; i <= 12; i++) {
      const row = readRows.get(i);
      if (row && brand in row) arr[i - 1] = row[brand];
    }

    table[brand] = arr;
    lg(`  ${brand}: ${arr.filter(v => v != null && v > 0).length}/12`);
  }

  if (table.amex.some(v => v != null) && table.hipercard.every(v => v == null)) {
    table.hipercard = [...table.amex];
    lg('Copied amex → hipercard');
  }

  return {
    meta: { anticipation_rate: antRate, rates_include_anticipation: includesAnt, combined_amex_hipercard: false, confidence, chargeback_fee: chargebackFee },
    table,
    source: 'llm-openai',
  };
}

// ─── OpenAI call ──────────────────────────────────────────────────────────────

async function callOpenAI(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.');
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
  if (!raw) throw new Error('OpenAI retornou resposta vazia.');
  if (response.choices[0]?.finish_reason === 'length') throw new Error('Resposta truncada pelo OpenAI (finish_reason=length).');
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

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const lg = (m: string) => { console.log(`[parse-pdf] ${m}`); logs.push(m); };

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: 'OPENAI_API_KEY não configurada. Adicione a variável de ambiente e reinicie o servidor.',
      debug: { logs },
    }, { status: 503 });
  }

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

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const base64 = fileBuffer.toString('base64');
  lg(`File: ${file.name}, mime=${mimeType}, ${(file.size / 1024).toFixed(0)}KB`);

  let raw: string;
  try {
    lg('OpenAI: calling...');
    raw = await callOpenAI(base64, mimeType);
    lg(`OpenAI: ✓ ${raw.length} chars`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lg(`OpenAI: failed — ${msg}`);
    return NextResponse.json({
      error: `Falha ao processar com OpenAI: ${msg}`,
      debug: { logs },
    }, { status: 502 });
  }

  let parsed: ParsedTable;
  try {
    parsed = parseChainOfThought(raw, logs);
  } catch (err) {
    lg(`Parse error: ${err}`);
    return NextResponse.json({ error: 'Falha ao interpretar resposta da IA.', debug: { logs } }, { status: 500 });
  }

  const quality = checkQuality(parsed);
  lg(`Quality: valid=${quality.valid}, total=${quality.totalFilled}`);

  lg('Building matrix...');
  const { meta, table } = parsed;
  const antRate = meta.anticipation_rate ?? 0;
  const includesAnt = meta.rates_include_anticipation && antRate > 0;
  const matrix = buildMatrix(table, antRate, includesAnt, logs);

  const finalCounts: Record<string, number> = {};
  for (const brand of BRANDS) {
    let c = 0;
    for (let i = 1; i <= 12; i++) {
      if (matrix[brand][i as InstallmentNumber]?.mdrBase) c++;
    }
    finalCounts[brand] = c;
  }
  lg(`Final counts: ${JSON.stringify(finalCounts)}`);

  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (meta.chargeback_fee > 0) fees.chargebackFee = meta.chargeback_fee.toFixed(2);

  const missingData: string[] = [];
  for (const brand of BRANDS) {
    const n = finalCounts[brand];
    if (n === 0) missingData.push(brand);
    else if (n < 12) missingData.push(`${brand} (${n}/12)`);
  }

  const confLabel: 'high' | 'medium' | 'low' =
    meta.confidence >= 80 ? 'high' : meta.confidence >= 50 ? 'medium' : 'low';

  lg(`DONE: partial=${!quality.valid}, confidence=${meta.confidence}`);

  return NextResponse.json({
    matrix,
    fees,
    confidence: confLabel,
    confidenceScore: meta.confidence,
    missingData,
    partial: !quality.valid,
    debug: {
      logs,
      provider: 'openai',
      quality: { totalFilled: Object.values(finalCounts).reduce((a, b) => a + b, 0), perBrand: finalCounts },
      rawFull: raw,
      parsedTable: table,
    },
  });
}
