import { BRANDS, BrandName, InstallmentNumber, MDREntry } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import { BrandArray } from './types';

export function buildMatrix(
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
