import { BRANDS } from '@/types/pricing';
import { BrandArray, ParsedTable, QualityReport } from './types';

export function checkQuality(parsed: ParsedTable): QualityReport {
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

export function parseChainOfThought(raw: string, logs: string[]): ParsedTable {
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
