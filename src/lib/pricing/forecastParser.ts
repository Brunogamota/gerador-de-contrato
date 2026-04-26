import * as XLSX from 'xlsx';
import type { OperationData } from './operationalScore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function numOf(s: unknown): number {
  if (typeof s === 'number') return isNaN(s) ? 0 : s;
  if (typeof s === 'string') {
    const n = parseFloat(s.replace(/[^\d.,-]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function pct(s: unknown): number {
  const n = numOf(s);
  // Values already in % (e.g. "45" → 45) or as fraction (0.45 → 45)
  return n > 1 ? n : n * 100;
}

/** Flatten a sheet into rows of { normalised_label → raw_value } by scanning for key-value pairs */
function sheetToKV(ws: XLSX.WorkSheet): Record<string, unknown> {
  const ref = ws['!ref'];
  if (!ref) return {};

  const range = XLSX.utils.decode_range(ref);
  const kv: Record<string, unknown> = {};

  // Walk every row; if a cell looks like a label (string ending in ':' or
  // followed by a value cell in the same row) capture as key→value.
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c - 1; c++) {
      const labelAddr = XLSX.utils.encode_cell({ r, c });
      const valueAddr = XLSX.utils.encode_cell({ r, c: c + 1 });
      const labelCell = ws[labelAddr];
      const valueCell = ws[valueAddr];
      if (!labelCell) continue;
      const raw = typeof labelCell.v === 'string' ? labelCell.v : String(labelCell.v ?? '');
      if (!raw.trim()) continue;
      const key = norm(raw.replace(/:$/, ''));
      if (key && valueCell !== undefined) {
        kv[key] = valueCell.v;
      }
    }
  }

  return kv;
}

/** Also extract a flat array of all string-like rows for brand/transaction mix tables */
function sheetToRows(ws: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
  return rows.map((r) => r.map((v) => (v === null || v === undefined ? '' : String(v))));
}

// ── Field matchers ────────────────────────────────────────────────────────────
// Each matcher checks if a normalised key matches a known concept.

const M = {
  legalName:    (k: string) => /razao.?social|nome.?empresa|empresa/.test(k),
  tradeName:    (k: string) => /nome.?fantasia|fantasia/.test(k),
  cnpj:         (k: string) => /cnpj/.test(k),
  website:      (k: string) => /site|website|url/.test(k),
  businessModel:(k: string) => /modelo.?negocio|segmento|ramo/.test(k),
  monthlyTpv:   (k: string) => /tpv.?mensal|volume.?mensal|faturamento.?mensal/.test(k),
  projTpv12m:   (k: string) => /tpv.?(12|doze)|projecao.?12|projetado.?12/.test(k),
  monthlyTxns:  (k: string) => /transacoes?.?mes|qtd.?transacoes|quantidade.?transac/.test(k),
  avgTicket:    (k: string) => /ticket.?medio|valor.?medio/.test(k),
  currentRate:  (k: string) => /taxa.?atual|mdr.?atual|taxa.?media.?atual/.test(k),
  observations: (k: string) => /observac|obs\.?$|notas?/.test(k),
  // capture flags
  capPresent:   (k: string) => /cartao.?presente|card.?present|ponto.?de.?venda/.test(k),
  capCnp:       (k: string) => /cartao.?nao.?presente|card.?not.?present|e.?commerce|ecommerce/.test(k),
  capTef:       (k: string) => /tef|automacao.?comercial/.test(k),
  capTap:       (k: string) => /tap.?on.?phone|soft.?pos/.test(k),
  cap3ds:       (k: string) => /3ds|autenticacao.?3d/.test(k),
  capSdk:       (k: string) => /sdk|integracao.?sdk/.test(k),
  capWl:        (k: string) => /white.?label/.test(k),
  capAf:        (k: string) => /antifraude|anti.?fraud/.test(k),
  // anticipation
  antNeed:      (k: string) => /necessidade.?antecip|percentual.?antecip|antecip.?(%)/.test(k),
  antMonthly:   (k: string) => /volume.?antecip|valor.?antecip/.test(k),
  antDays:      (k: string) => /prazo.?antecip|dias.?antecip/.test(k),
  antOwn:       (k: string) => /funding.?proprio|capital.?proprio/.test(k),
  antReborn:    (k: string) => /reborn.?settlement|settlement.?reborn/.test(k),
  // brand mix
  brandVisa:    (k: string) => /^visa/.test(k),
  brandMc:      (k: string) => /^master/.test(k),
  brandElo:     (k: string) => /^elo/.test(k),
  brandHiper:   (k: string) => /^hiper/.test(k),
  brandAmex:    (k: string) => /^amex|american.?express/.test(k),
  // tx mix
  txPix:        (k: string) => /^pix/.test(k),
  txDebit:      (k: string) => /^debito|^debit/.test(k),
  txPrepaid:    (k: string) => /^prepago|^prepaid/.test(k),
  txCredit1x:   (k: string) => /credito.?1x|credit.?1x|^1x/.test(k),
  txCredit2_6:  (k: string) => /credito.?2.6|2.?a.?6|2.?ate.?6/.test(k),
  txCredit7_12: (k: string) => /credito.?7.12|7.?a.?12|7.?ate.?12/.test(k),
};

function boolOf(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return /^(sim|yes|true|1|x)$/i.test(v.trim());
  return false;
}

function findKV<T>(kv: Record<string, unknown>, matcher: (k: string) => boolean, transform: (v: unknown) => T): T | undefined {
  for (const [k, v] of Object.entries(kv)) {
    if (matcher(k)) return transform(v);
  }
  return undefined;
}

// ── MCC extraction ────────────────────────────────────────────────────────────

function extractMccMix(rows: string[][]): Array<{ mcc: string; share: number }> {
  const result: Array<{ mcc: string; share: number }> = [];
  const mccRe = /\b\d{4}\b/;

  for (const row of rows) {
    const rowText = row.join(' ');
    const match = rowText.match(mccRe);
    if (!match) continue;

    const mcc = match[0];
    // Try to find a share number in the row
    const numbers = row.map(numOf).filter((n) => n > 0 && n <= 100);
    if (numbers.length > 0) {
      result.push({ mcc, share: numbers[0] });
    }
  }

  // Normalise shares to sum ~100
  const total = result.reduce((s, e) => s + e.share, 0);
  if (total > 0 && total !== 100) {
    result.forEach((e) => { e.share = Math.round((e.share / total) * 100); });
  }

  return result.length ? result : [{ mcc: '5999', share: 100 }];
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ParseResult {
  data: Partial<OperationData>;
  extracted: string[];  // field names successfully extracted
  missing:   string[];  // field names that fell back to default
}

export function parseForecastFile(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use the first sheet (or one named "Forecast"/"Acquirer"/"Dados")
  const sheetName =
    workbook.SheetNames.find((n) => /forecast|acquirer|dados|operacional/i.test(n)) ??
    workbook.SheetNames[0];

  if (!sheetName) {
    console.warn('[forecastParser] No sheets found in workbook');
    return { data: {}, extracted: [], missing: ['all fields'] };
  }

  const ws   = workbook.Sheets[sheetName];
  const kv   = sheetToKV(ws);
  const rows = sheetToRows(ws);

  console.log('[forecastParser] sheet=%s, kv keys=%d, rows=%d', sheetName, Object.keys(kv).length, rows.length);
  console.log('[forecastParser] kv sample:', Object.fromEntries(Object.entries(kv).slice(0, 10)));

  const extracted: string[] = [];
  const missing:   string[] = [];

  function get<T>(field: string, matcher: (k: string) => boolean, transform: (v: unknown) => T, fallback: T): T {
    const v = findKV(kv, matcher, transform);
    if (v !== undefined && v !== fallback) {
      extracted.push(field);
      console.log('[forecastParser] %s = %o', field, v);
      return v;
    }
    missing.push(field);
    return fallback;
  }

  const legalName  = get('company.legalName',   M.legalName,   String,  '');
  const tradeName  = get('company.tradeName',    M.tradeName,   String,  legalName);
  const cnpj       = get('company.cnpj',         M.cnpj,        String,  '');
  const website    = get('company.website',       M.website,     String,  '');
  const bizModel   = get('company.businessModel',M.businessModel,String, '');
  const monthlyTpv = get('volume.monthlyTpv',    M.monthlyTpv,  numOf,   0);
  const projTpv12m = get('volume.projectedTpv12m',M.projTpv12m, numOf,   monthlyTpv * 12);
  const monthlyTxns= get('volume.monthlyTransactions',M.monthlyTxns,numOf,0);
  const avgTicket  = get('volume.averageTicket', M.avgTicket,   numOf,   0);
  const currentRate= get('currentRate',          M.currentRate, numOf,   0);
  const observations=get('observations',         M.observations,String,  '');

  // Capture flags
  const capPresent = get('capture.cardPresent',     M.capPresent, boolOf, false);
  const capCnp     = get('capture.cardNotPresent',  M.capCnp,     boolOf, false);
  const capTef     = get('capture.tef',             M.capTef,     boolOf, false);
  const capTap     = get('capture.tapOnPhone',      M.capTap,     boolOf, false);
  const cap3ds     = get('capture.threeDs',         M.cap3ds,     boolOf, false);
  const capSdk     = get('capture.sdkIntegration',  M.capSdk,     boolOf, false);
  const capWl      = get('capture.whiteLabel',      M.capWl,      boolOf, false);
  const capAf      = get('capture.customAntifraud', M.capAf,      boolOf, false);

  // Anticipation
  const antNeed    = get('anticipation.need',    M.antNeed,    pct,    0);
  const antMonthly = get('anticipation.monthly', M.antMonthly, numOf,  0);
  const antDays    = get('anticipation.days',    M.antDays,    numOf,  30);
  const antOwn     = get('anticipation.ownFunding',   M.antOwn,    boolOf, false);
  const antReborn  = get('anticipation.rebornSettlement', M.antReborn, boolOf, false);

  // Brand mix — try kv first, then scan rows
  let brandVisa  = findKV(kv, M.brandVisa,  pct);
  let brandMc    = findKV(kv, M.brandMc,    pct);
  let brandElo   = findKV(kv, M.brandElo,   pct);
  let brandHiper = findKV(kv, M.brandHiper, pct);
  let brandAmex  = findKV(kv, M.brandAmex,  pct);

  if (brandVisa !== undefined) extracted.push('brandMix.visa');
  else { missing.push('brandMix.visa'); brandVisa = 50; }
  if (brandMc   !== undefined) extracted.push('brandMix.mastercard');
  else { missing.push('brandMix.mastercard'); brandMc = 35; }
  if (brandElo  !== undefined) extracted.push('brandMix.elo');
  else { missing.push('brandMix.elo'); brandElo = 10; }
  if (brandHiper !== undefined) extracted.push('brandMix.hiper');
  else { missing.push('brandMix.hiper'); brandHiper = 3; }
  if (brandAmex !== undefined) extracted.push('brandMix.amex');
  else { missing.push('brandMix.amex'); brandAmex = 2; }

  // Tx mix
  let txPix   = findKV(kv, M.txPix,       pct);
  let txDebit = findKV(kv, M.txDebit,     pct);
  let txPre   = findKV(kv, M.txPrepaid,   pct);
  let tx1x    = findKV(kv, M.txCredit1x,  pct);
  let tx2_6   = findKV(kv, M.txCredit2_6, pct);
  let tx7_12  = findKV(kv, M.txCredit7_12,pct);

  if (txPix   !== undefined) extracted.push('transactionMix.pix');
  else { missing.push('transactionMix.pix'); txPix = 0; }
  if (txDebit !== undefined) extracted.push('transactionMix.debit');
  else { missing.push('transactionMix.debit'); txDebit = 0; }
  if (txPre   !== undefined) extracted.push('transactionMix.prepaid');
  else { missing.push('transactionMix.prepaid'); txPre = 0; }
  if (tx1x    !== undefined) extracted.push('transactionMix.credit1x');
  else { missing.push('transactionMix.credit1x'); tx1x = 0; }
  if (tx2_6   !== undefined) extracted.push('transactionMix.credit2to6');
  else { missing.push('transactionMix.credit2to6'); tx2_6 = 0; }
  if (tx7_12  !== undefined) extracted.push('transactionMix.credit7to12');
  else { missing.push('transactionMix.credit7to12'); tx7_12 = 0; }

  // MCC mix
  const mccMix = extractMccMix(rows);
  if (mccMix.some((m) => m.mcc !== '5999')) {
    extracted.push('mccMix');
  } else {
    missing.push('mccMix');
  }
  console.log('[forecastParser] mccMix=%o', mccMix);

  const data: Partial<OperationData> = {
    company: { legalName, tradeName: tradeName || legalName, cnpj, businessModel: bizModel, website },
    volume: {
      monthlyTpv,
      projectedTpv12m: projTpv12m || monthlyTpv * 12,
      monthlyTransactions: monthlyTxns,
      averageTicket: avgTicket,
    },
    mccMix,
    transactionMix: { pix: txPix, debit: txDebit, prepaid: txPre, credit1x: tx1x, credit2to6: tx2_6, credit7to12: tx7_12 },
    brandMix: { visa: brandVisa, mastercard: brandMc, elo: brandElo, hiper: brandHiper, amex: brandAmex },
    capture: { cardPresent: capPresent, cardNotPresent: capCnp, tef: capTef, tapOnPhone: capTap, threeDs: cap3ds, sdkIntegration: capSdk, whiteLabel: capWl, customAntifraud: capAf },
    anticipation: { receivablesAnticipationNeed: antNeed, estimatedMonthlyAnticipation: antMonthly, averageAnticipationDays: antDays, ownFunding: antOwn, rebornSettlement: antReborn },
    ...(currentRate > 0 ? { currentRate } : {}),
    ...(observations ? { observations } : {}),
  };

  console.log('[forecastParser] extracted=%d fields, missing=%d fields', extracted.length, missing.length);
  console.log('[forecastParser] extracted:', extracted);
  console.log('[forecastParser] missing:', missing);

  return { data, extracted, missing };
}

/** Parse a CSV string (fallback for .csv files) */
export function parseForecastCsv(text: string): ParseResult {
  const wb = XLSX.read(text, { type: 'string' });
  return parseForecastFile(
    XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
  );
}
