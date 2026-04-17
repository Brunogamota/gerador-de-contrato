import Decimal from 'decimal.js';
import {
  BrandName,
  BRANDS,
  INSTALLMENTS,
  InstallmentNumber,
  MDREntry,
  MDRMatrix,
  BrandMatrix,
} from '@/types/pricing';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const DECIMAL_PLACES = 4;
export const DISPLAY_PLACES = 2;

export function createEmptyEntry(): MDREntry {
  return {
    mdrBase: '',
    anticipationRate: '',
    finalMdr: '',
    isManualOverride: false,
  };
}

export function createEmptyMatrix(): MDRMatrix {
  const matrix = {} as MDRMatrix;
  for (const brand of BRANDS) {
    matrix[brand] = {} as BrandMatrix;
    for (const installment of INSTALLMENTS) {
      matrix[brand][installment as InstallmentNumber] = createEmptyEntry();
    }
  }
  return matrix;
}

export function safeDecimal(value: string | number | undefined | null): Decimal | null {
  if (value === undefined || value === null || value === '') return null;
  try {
    const d = new Decimal(String(value).replace(',', '.'));
    if (!d.isFinite()) return null;
    return d;
  } catch {
    return null;
  }
}

export function calculateFinalMdr(mdrBase: string, anticipationRate: string): string {
  const base = safeDecimal(mdrBase);
  if (base === null) return '';
  const anticipation = safeDecimal(anticipationRate) ?? new Decimal(0);
  if (base.isNegative()) return '';
  return base.plus(anticipation).toFixed(DECIMAL_PLACES);
}

export function updateEntry(
  entry: MDREntry,
  field: 'mdrBase' | 'anticipationRate',
  value: string
): MDREntry {
  const updated = { ...entry, [field]: value };
  if (!updated.isManualOverride) {
    updated.finalMdr = calculateFinalMdr(updated.mdrBase, updated.anticipationRate);
  }
  return updated;
}

export function setManualFinalMdr(entry: MDREntry, value: string): MDREntry {
  return { ...entry, finalMdr: value, isManualOverride: true };
}

export function clearManualOverride(entry: MDREntry): MDREntry {
  return {
    ...entry,
    isManualOverride: false,
    finalMdr: calculateFinalMdr(entry.mdrBase, entry.anticipationRate),
  };
}

export function updateMatrixEntry(
  matrix: MDRMatrix,
  brand: BrandName,
  installment: InstallmentNumber,
  field: 'mdrBase' | 'anticipationRate' | 'finalMdr',
  value: string
): MDRMatrix {
  const entry = matrix[brand][installment];
  let updated: MDREntry;

  if (field === 'finalMdr') {
    updated = setManualFinalMdr(entry, value);
  } else {
    updated = updateEntry(entry, field, value);
  }

  return {
    ...matrix,
    [brand]: {
      ...matrix[brand],
      [installment]: updated,
    },
  };
}

export function applyBulkRate(
  matrix: MDRMatrix,
  brand: BrandName,
  field: 'mdrBase' | 'anticipationRate',
  value: string,
  installments?: InstallmentNumber[]
): MDRMatrix {
  const targets = installments ?? ([...INSTALLMENTS] as InstallmentNumber[]);
  let updated = { ...matrix, [brand]: { ...matrix[brand] } };

  for (const inst of targets) {
    const entry = updated[brand][inst];
    const newEntry = updateEntry(entry, field, value);
    updated = {
      ...updated,
      [brand]: { ...updated[brand], [inst]: newEntry },
    };
  }

  return updated;
}

export function applyProgressiveRates(
  matrix: MDRMatrix,
  brand: BrandName,
  baseRate1x: string,
  incrementPerInstallment: string
): MDRMatrix {
  const base = safeDecimal(baseRate1x);
  const increment = safeDecimal(incrementPerInstallment);
  if (!base || !increment) return matrix;

  let updated = { ...matrix, [brand]: { ...matrix[brand] } };

  for (const inst of INSTALLMENTS) {
    const rate = base.plus(increment.times(inst - 1)).toFixed(DECIMAL_PLACES);
    const entry = updated[brand][inst as InstallmentNumber];
    const newEntry = updateEntry(entry, 'mdrBase', rate);
    updated = {
      ...updated,
      [brand]: { ...updated[brand], [inst]: newEntry },
    };
  }

  return updated;
}

export function calculateBrandAverage(matrix: MDRMatrix, brand: BrandName): string {
  const values: Decimal[] = [];
  for (const inst of INSTALLMENTS) {
    const d = safeDecimal(matrix[brand][inst as InstallmentNumber].finalMdr);
    if (d) values.push(d);
  }
  if (values.length === 0) return '';
  const sum = values.reduce((a, b) => a.plus(b), new Decimal(0));
  return sum.div(values.length).toFixed(DECIMAL_PLACES);
}

export function calculateBlendedMdr(matrix: MDRMatrix): string {
  const values: Decimal[] = [];
  for (const brand of BRANDS) {
    for (const inst of INSTALLMENTS) {
      const d = safeDecimal(matrix[brand][inst as InstallmentNumber].finalMdr);
      if (d) values.push(d);
    }
  }
  if (values.length === 0) return '';
  const sum = values.reduce((a, b) => a.plus(b), new Decimal(0));
  return sum.div(values.length).toFixed(DECIMAL_PLACES);
}

export function normalizeMdrInput(value: string): string {
  const cleaned = value.replace(',', '.').trim();
  const d = safeDecimal(cleaned);
  if (!d) return '';
  return d.toFixed(DECIMAL_PLACES);
}

export function expandGroupedRates(
  groups: Array<{
    from: number;
    to: number;
    mdrBase: string;
    anticipationRate?: string;
  }>
): Partial<BrandMatrix> {
  const result: Partial<BrandMatrix> = {};
  for (const group of groups) {
    for (let i = group.from; i <= group.to; i++) {
      if (i >= 1 && i <= 12) {
        const mdrBase = normalizeMdrInput(group.mdrBase);
        const anticipationRate = normalizeMdrInput(group.anticipationRate ?? '0');
        result[i as InstallmentNumber] = {
          mdrBase,
          anticipationRate,
          finalMdr: calculateFinalMdr(mdrBase, anticipationRate),
          isManualOverride: false,
        };
      }
    }
  }
  return result;
}

export function mergePartialMatrix(
  base: MDRMatrix,
  brand: BrandName,
  partial: Partial<BrandMatrix>
): MDRMatrix {
  return {
    ...base,
    [brand]: { ...base[brand], ...partial },
  };
}
