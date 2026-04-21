import Decimal from 'decimal.js';
import { MDRMatrix, BrandName, InstallmentNumber, BRANDS, INSTALLMENTS } from '@/types/pricing';
import { updateMatrixEntry } from '@/lib/calculations/mdr';

export type MarginConfig = {
  type: 'percent' | 'fixed';
  value: string; // decimal string, e.g. "1.50" = 1.5% ou R$1.50
};

export const DEFAULT_MARGIN_CONFIG: MarginConfig = { type: 'percent', value: '0' };

/**
 * Applies margin to every filled cell of the cost table.
 *
 * percent: finalRate = costRate * (1 + margin/100)
 * fixed:   finalRate = costRate + margin
 *
 * Cells with no cost rate (mdrBase = '') are left empty in the final table.
 */
function safeDecimalFromConfig(value: string): Decimal {
  try { return new Decimal(value || '0'); } catch { return new Decimal(0); }
}

export function applyMargin(costTable: MDRMatrix, config: MarginConfig): MDRMatrix {
  const marginVal = safeDecimalFromConfig(config.value);
  let result = costTable;

  for (const brand of BRANDS as BrandName[]) {
    for (const inst of INSTALLMENTS as unknown as InstallmentNumber[]) {
      const entry = costTable[brand][inst];
      if (!entry?.mdrBase) continue;

      const cost = new Decimal(entry.mdrBase);
      let finalBase: Decimal;

      if (config.type === 'percent') {
        finalBase = cost.plus(cost.times(marginVal.dividedBy(100)));
      } else {
        finalBase = cost.plus(marginVal);
      }

      const antRate = entry.anticipationRate ? new Decimal(entry.anticipationRate) : new Decimal(0);
      const finalMdr = finalBase.plus(antRate);

      result = updateMatrixEntry(result, brand, inst, 'mdrBase', finalBase.toFixed(4));
      result = updateMatrixEntry(result, brand, inst, 'anticipationRate', antRate.toFixed(4));
      // updateMatrixEntry recalculates finalMdr automatically
      void finalMdr; // used above for clarity, Decimal calc is handled by updateMatrixEntry
    }
  }

  return result;
}

/**
 * Calculates per-cell margin delta for display in the internal view.
 * Returns a matrix of { cost, margin, final } strings per cell.
 */
export type MarginBreakdown = {
  cost: string;
  margin: string;
  final: string;
};

export function computeMarginBreakdown(
  costTable: MDRMatrix,
  finalTable: MDRMatrix,
  brand: BrandName,
  inst: InstallmentNumber,
): MarginBreakdown | null {
  const costEntry = costTable[brand][inst];
  const finalEntry = finalTable[brand][inst];
  if (!costEntry?.mdrBase || !finalEntry?.mdrBase) return null;

  const cost = new Decimal(costEntry.finalMdr || costEntry.mdrBase);
  const final = new Decimal(finalEntry.finalMdr || finalEntry.mdrBase);
  const margin = final.minus(cost);

  return {
    cost: cost.toFixed(2),
    margin: margin.toFixed(2),
    final: final.toFixed(2),
  };
}
