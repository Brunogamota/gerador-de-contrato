import Decimal from 'decimal.js';
import {
  BrandName,
  BRANDS,
  BRAND_LABELS,
  INSTALLMENTS,
  InstallmentNumber,
  MDRMatrix,
  ValidationIssue,
  BrandStats,
  MDRValidationResult,
} from '@/types/pricing';
import { safeDecimal, calculateBlendedMdr } from './mdr';

const THRESHOLDS = {
  MAX_MDR: new Decimal('15'),
  MAX_ANTICIPATION: new Decimal('5'),
  MIN_MDR: new Decimal('0'),
  PROGRESSION_TOLERANCE: new Decimal('0.0001'),
} as const;

function label(brand: BrandName, installment?: number): string {
  const b = BRAND_LABELS[brand];
  return installment ? `${b} ${installment}x` : b;
}

export function validateMatrix(matrix: MDRMatrix): MDRValidationResult {
  const issues: ValidationIssue[] = [];

  for (const brand of BRANDS) {
    const filledEntries: Array<{ installment: number; final: Decimal }> = [];

    for (const inst of INSTALLMENTS) {
      const entry = matrix[brand][inst as InstallmentNumber];

      if (!entry.mdrBase && !entry.finalMdr) continue;

      const base = safeDecimal(entry.mdrBase);
      const anticipation = safeDecimal(entry.anticipationRate) ?? new Decimal(0);
      const final = safeDecimal(entry.finalMdr);

      if (base === null && final === null) {
        issues.push({
          type: 'error',
          brand,
          installment: inst,
          message: `${label(brand, inst)}: valor inválido`,
          code: 'INVALID_VALUE',
        });
        continue;
      }

      const effectiveFinal = final ?? base!.plus(anticipation);

      if (effectiveFinal.isNegative()) {
        issues.push({
          type: 'error',
          brand,
          installment: inst,
          message: `${label(brand, inst)}: MDR não pode ser negativo`,
          code: 'NEGATIVE_MDR',
        });
        continue;
      }

      if (base && base.greaterThan(THRESHOLDS.MAX_MDR)) {
        issues.push({
          type: 'warning',
          brand,
          installment: inst,
          message: `${label(brand, inst)}: MDR base muito alto (${base.toFixed(2)}%) — verifique se está correto`,
          code: 'HIGH_MDR',
        });
      }

      if (anticipation.greaterThan(THRESHOLDS.MAX_ANTICIPATION)) {
        issues.push({
          type: 'warning',
          brand,
          installment: inst,
          message: `${label(brand, inst)}: Taxa de antecipação muito alta (${anticipation.toFixed(2)}%)`,
          code: 'HIGH_ANTICIPATION',
        });
      }

      filledEntries.push({ installment: inst, final: effectiveFinal });
    }

    // Progression check — higher installments should not be cheaper
    for (let i = 1; i < filledEntries.length; i++) {
      const prev = filledEntries[i - 1];
      const curr = filledEntries[i];
      if (
        curr.final.plus(THRESHOLDS.PROGRESSION_TOLERANCE).lessThan(prev.final)
      ) {
        issues.push({
          type: 'warning',
          brand,
          installment: curr.installment,
          message: `${label(brand, curr.installment)} (${curr.final.toFixed(2)}%) < ${label(brand, prev.installment)} (${prev.final.toFixed(2)}%) — progressão invertida`,
          code: 'PROGRESSION_ANOMALY',
        });
      }
    }
  }

  const stats: BrandStats[] = BRANDS.map((brand) => {
    const values: Decimal[] = [];
    let filledCount = 0;

    for (const inst of INSTALLMENTS) {
      const entry = matrix[brand][inst as InstallmentNumber];
      const d = safeDecimal(entry.finalMdr);
      if (d) {
        values.push(d);
        filledCount++;
      }
    }

    if (values.length === 0) {
      return { brand, avgMdr: '', minMdr: '', maxMdr: '', isComplete: false, filledCount: 0 };
    }

    const sum = values.reduce((a, b) => a.plus(b), new Decimal(0));
    return {
      brand,
      avgMdr: sum.div(values.length).toFixed(4),
      minMdr: Decimal.min(...values).toFixed(4),
      maxMdr: Decimal.max(...values).toFixed(4),
      isComplete: filledCount === 12,
      filledCount,
    };
  });

  const hasErrors = issues.some((i) => i.type === 'error');
  const atLeastOneBrandComplete = stats.some((s) => s.isComplete);

  return {
    isValid: !hasErrors,
    canGenerateContract: !hasErrors && atLeastOneBrandComplete,
    issues,
    stats,
    blendedMdr: calculateBlendedMdr(matrix),
  };
}

export function getIssuesForCell(
  issues: ValidationIssue[],
  brand: BrandName,
  installment: number
): ValidationIssue[] {
  return issues.filter((i) => i.brand === brand && i.installment === installment);
}

export function getCellSeverity(
  issues: ValidationIssue[],
  brand: BrandName,
  installment: number,
  hasFinalMdr?: boolean
): 'error' | 'warning' | 'ok' | 'empty' {
  if (hasFinalMdr === false) return 'empty';
  const cellIssues = getIssuesForCell(issues, brand, installment);
  if (cellIssues.some((i) => i.type === 'error')) return 'error';
  if (cellIssues.some((i) => i.type === 'warning')) return 'warning';
  return 'ok';
}
