import { createWorker } from 'tesseract.js';
import type { BrandName } from '@/types/pricing';

export interface OCRWord {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

export interface OCRTableResult {
  rawText: string;
  words: OCRWord[];
  columnOrder: BrandName[];
  rawRows: Record<number, number[]>; // installment → values in column order
  table: Record<string, (number | null)[]>;
  confidence: number;
  filledTotal: number;
}

// ─── Brand header patterns ───────────────────────────────────────────────────

const BRAND_ALIASES: Array<{ re: RegExp; brand: BrandName }> = [
  { re: /\bvisa\b/i,             brand: 'visa' },
  { re: /\bmaster(card)?\b/i,    brand: 'mastercard' },
  { re: /\belo\b/i,              brand: 'elo' },
  { re: /\bamex\b/i,             brand: 'amex' },
  { re: /\bhiper(card)?\b/i,     brand: 'hipercard' },
];

// ─── Detect column order from OCR text ───────────────────────────────────────

function detectColumnOrder(lines: string[]): BrandName[] {
  for (const line of lines) {
    const hits: Array<{ brand: BrandName; idx: number }> = [];
    for (const { re, brand } of BRAND_ALIASES) {
      const m = line.search(re);
      if (m !== -1) hits.push({ brand, idx: m });
    }
    if (hits.length >= 3) {
      hits.sort((a, b) => a.idx - b.idx);
      return hits.map(h => h.brand);
    }
  }
  return ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];
}

// ─── Parse data rows from OCR plain text ─────────────────────────────────────

// Matches lines like:  "1x  2,69  2,59  3,19  3,49  3,49"
//                      "1   2.69  2.59  3.19  3.49  3.49"
// The installment number may or may not have an 'x' suffix.
const ROW_RE = /^(\d{1,2})\s*[xX]?\s+([\d.,]+(?:\s+[\d.,]+)+)/;

function parseDataRows(lines: string[]): Record<number, number[]> {
  const rows: Record<number, number[]> = {};
  for (const raw of lines) {
    const line = raw.trim();
    const m = ROW_RE.exec(line);
    if (!m) continue;

    const num = parseInt(m[1], 10);
    if (num < 1 || num > 12) continue;

    const values = m[2]
      .split(/\s+/)
      .map(v => parseFloat(v.replace(',', '.')))
      .filter(v => Number.isFinite(v) && v > 0.01 && v < 50); // valid MDR range

    if (values.length >= 2) rows[num] = values;
  }
  return rows;
}

// ─── Positional bounding-box table extraction (more robust for messy OCR) ────
// Groups words by y-cluster (rows), then x-cluster (columns) within each row.

function median(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function clusterOneDim(values: number[], gap: number): number[][] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= gap) {
      clusters[clusters.length - 1].push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }
  return clusters;
}

// A decimal-looking token: digits with optional comma/period separator
const DECIMAL_RE = /^[\d]{1,3}[.,]\d{1,4}$/;
// A row-label token like "1x", "12x", "1", …
const INST_RE = /^(\d{1,2})[xX]?$/;

function positionalExtract(
  words: OCRWord[],
  logs: string[]
): { rows: Record<number, number[]>; columnOrder: BrandName[] } {
  const lg = (m: string) => logs.push(`  [pos] ${m}`);

  if (words.length === 0) return { rows: {}, columnOrder: [] };

  // ── Find brand header words ──────────────────────────────────────────────
  const headerWords = words.filter(w =>
    BRAND_ALIASES.some(({ re }) => re.test(w.text))
  );
  let columnOrder: BrandName[] = [];
  if (headerWords.length >= 2) {
    const sorted = [...headerWords].sort((a, b) => a.x - b.x);
    const seen = new Set<BrandName>();
    for (const hw of sorted) {
      for (const { re, brand } of BRAND_ALIASES) {
        if (re.test(hw.text) && !seen.has(brand)) {
          seen.add(brand);
          columnOrder.push(brand);
        }
      }
    }
    lg(`Brand columns from header: ${columnOrder.join(', ')}`);
  }
  if (columnOrder.length < 3) {
    columnOrder = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];
    lg('Using default column order');
  }

  // ── Find numeric (decimal) words ─────────────────────────────────────────
  const numWords = words.filter(w => DECIMAL_RE.test(w.text));
  if (numWords.length < 6) {
    lg(`Too few decimal words (${numWords.length}) for positional extraction`);
    return { rows: {}, columnOrder };
  }

  // ── Cluster into rows by y-center ────────────────────────────────────────
  const yCenters = numWords.map(w => w.y + w.h / 2);
  const wordHeight = median(numWords.map(w => w.h));
  const yClusters = clusterOneDim(yCenters, wordHeight * 1.2);

  // Filter rows that have enough values (≥3 decimals → looks like a data row)
  const dataRows = yClusters.filter(yc => yc.length >= 2);
  lg(`Y-clusters with ≥2 values: ${dataRows.length}`);

  // ── For each row cluster, collect values sorted by x ─────────────────────
  // Also look for the installment label just to the left of the first value
  const instWords = words.filter(w => INST_RE.test(w.text));

  const rows: Record<number, number[]> = {};
  let autoInst = 1;

  for (const yc of dataRows) {
    const yCenter = median(yc);
    // Find words in this y-cluster
    const rowWords = numWords.filter(w => {
      const cy = w.y + w.h / 2;
      return Math.abs(cy - yCenter) <= wordHeight * 0.6;
    });
    rowWords.sort((a, b) => a.x - b.x);

    const values = rowWords
      .map(w => parseFloat(w.text.replace(',', '.')))
      .filter(v => Number.isFinite(v) && v > 0.01 && v < 50);
    if (values.length < 2) continue;

    // Try to find the matching installment label
    let instNum = autoInst;
    const nearInstWord = instWords.find(iw => {
      const cy = iw.y + iw.h / 2;
      return Math.abs(cy - yCenter) <= wordHeight * 0.8 && iw.x < rowWords[0].x;
    });
    if (nearInstWord) {
      const m = INST_RE.exec(nearInstWord.text);
      if (m) instNum = parseInt(m[1], 10);
    }

    if (instNum >= 1 && instNum <= 12) {
      rows[instNum] = values;
      lg(`  ROW ${instNum}: [${values.join(', ')}]`);
    }
    autoInst++;
  }

  return { rows, columnOrder };
}

// ─── Public extraction function ───────────────────────────────────────────────

export async function ocrExtractTable(
  imageBuffer: Buffer,
  logs: string[]
): Promise<OCRTableResult> {
  const lg = (m: string) => { console.log(`[ocr] ${m}`); logs.push(m); };

  lg('Initializing Tesseract.js worker (lang=eng)...');
  const worker = await createWorker('eng', 1, {
    logger: () => {},
  });

  lg('Running OCR recognition...');
  const { data } = await worker.recognize(imageBuffer);
  await worker.terminate();

  const rawText = data.text;
  const overallConf = data.confidence ?? 0;
  lg(`OCR done: ${rawText.length} chars, overall confidence=${overallConf.toFixed(0)}%`);

  // ── Extract word-level bounding boxes ─────────────────────────────────────
  const words: OCRWord[] = [];
  for (const block of (data as any).blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          if ((word.confidence ?? 0) > 20 && word.text?.trim()) {
            words.push({
              text: word.text.trim(),
              x: word.bbox?.x0 ?? 0,
              y: word.bbox?.y0 ?? 0,
              w: (word.bbox?.x1 ?? 0) - (word.bbox?.x0 ?? 0),
              h: (word.bbox?.y1 ?? 0) - (word.bbox?.y0 ?? 0),
              confidence: word.confidence ?? 0,
            });
          }
        }
      }
    }
  }
  lg(`Words extracted: ${words.length}`);

  // ── Try positional extraction first ───────────────────────────────────────
  const { rows: posRows, columnOrder: posColOrder } = positionalExtract(words, logs);
  const posCount = Object.keys(posRows).length;
  lg(`Positional extraction: ${posCount} rows`);

  // ── Line-based extraction as complementary method ─────────────────────────
  const textLines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const lineColOrder = detectColumnOrder(textLines);
  const lineRows = parseDataRows(textLines);
  const lineCount = Object.keys(lineRows).length;
  lg(`Line-based extraction: ${lineCount} rows, col order: ${lineColOrder.join(',')}`);

  // ── Pick the best result ───────────────────────────────────────────────────
  const columnOrder = posCount >= lineCount ? posColOrder : lineColOrder;
  const rawRows = posCount >= lineCount ? posRows : lineRows;
  lg(`Using ${posCount >= lineCount ? 'positional' : 'line-based'} result: ${Object.keys(rawRows).length} rows`);

  // ── Build the brand table ──────────────────────────────────────────────────
  const brands = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];
  const table: Record<string, (number | null)[]> = {};
  for (const b of brands) table[b] = Array(12).fill(null);

  for (const [instStr, values] of Object.entries(rawRows)) {
    const inst = parseInt(instStr, 10);
    for (let col = 0; col < Math.min(values.length, columnOrder.length); col++) {
      table[columnOrder[col]][inst - 1] = values[col];
    }
  }

  // Infer combined amex/hipercard column
  if (table.amex.some(v => v != null) && table.hipercard.every(v => v == null)) {
    table.hipercard = [...table.amex];
    lg('Copied amex → hipercard (combined column inferred)');
  }

  const filledTotal = brands.reduce((acc, b) =>
    acc + table[b].filter(v => v != null && v > 0).length, 0
  );
  lg(`OCR table filled: ${filledTotal}/60`);

  for (const brand of brands) {
    lg(`  ${brand}: [${table[brand].map(v => v ?? 'null').join(', ')}]`);
  }

  return { rawText, words, columnOrder, rawRows, table, confidence: overallConf, filledTotal };
}
