import { NextResponse } from 'next/server';
import { BRANDS, BrandName, InstallmentNumber, MDREntry } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Deterministic mock: 12 installments × 5 brands, NO AI involved ────────────
// Purpose: isolate the pipeline. If the UI still shows 1/12 after this endpoint
// is called, the bug is strictly in the frontend (state / render). If it shows
// 12/12, the bug is upstream (AI provider / parser).

const MOCK_RATES: Record<BrandName, number[]> = {
  visa:       [2.69, 3.05, 3.95, 4.79, 5.09, 6.49, 8.29, 9.49, 9.89, 10.49, 11.29, 12.19],
  mastercard: [2.59, 2.95, 3.85, 4.69, 5.09, 6.29, 8.09, 9.29, 9.79, 10.39, 11.09, 11.99],
  elo:        [3.19, 3.95, 4.79, 5.59, 6.09, 7.19, 8.69, 9.59, 10.39, 11.09, 11.79, 12.49],
  amex:       [3.49, 4.19, 5.09, 5.89, 6.49, 7.59, 9.09, 9.99, 10.79, 11.49, 12.19, 12.89],
  hipercard:  [3.49, 4.19, 5.09, 5.89, 6.49, 7.59, 9.09, 9.99, 10.79, 11.49, 12.19, 12.89],
};

function countFilled(arr: (number | null)[]): number {
  return arr.filter(v => v != null && v > 0).length;
}

function countMatrixFilled(
  perBrand: Record<BrandName, Partial<Record<InstallmentNumber, MDREntry>>>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const brand of BRANDS) {
    out[brand] = Object.values(perBrand[brand]).filter(
      e => e != null && typeof e.mdrBase === 'string' && e.mdrBase.length > 0
    ).length;
  }
  return out;
}

function assertStageInvariant(
  stage: string,
  expected: Record<string, number>,
  actual: Record<string, number>,
  logs: string[]
): void {
  for (const brand of BRANDS) {
    const exp = expected[brand] ?? 0;
    const got = actual[brand] ?? 0;
    if (got < exp) {
      const msg = `ASSERTION FAILED [${stage}]: ${brand} dropped from ${exp} → ${got}`;
      console.error(`[parse-pdf/mock] ${msg}`);
      logs.push(msg);
    }
  }
}

export async function GET() {
  const logs: string[] = [];
  const lg = (m: string) => { console.log(`[parse-pdf/mock] ${m}`); logs.push(m); };

  lg('MOCK endpoint invoked — bypassing all AI providers');

  // ── STAGE=raw ───────────────────────────────────────────────────────────────
  const rawTable: Record<BrandName, (number | null)[]> = {
    visa: [...MOCK_RATES.visa],
    mastercard: [...MOCK_RATES.mastercard],
    elo: [...MOCK_RATES.elo],
    amex: [...MOCK_RATES.amex],
    hipercard: [...MOCK_RATES.hipercard],
  };
  const rawCounts: Record<string, number> = {};
  for (const brand of BRANDS) rawCounts[brand] = countFilled(rawTable[brand]);
  lg(`stage=raw counts=${JSON.stringify(rawCounts)}`);

  // ── STAGE=parsed (identity — mock has no parsing layer) ────────────────────
  const parsedCounts = { ...rawCounts };
  lg(`stage=parsed counts=${JSON.stringify(parsedCounts)}`);
  assertStageInvariant('raw→parsed', rawCounts, parsedCounts, logs);

  // ── STAGE=normalized (build perBrand → MDRMatrix) ──────────────────────────
  const perBrand: Record<BrandName, Partial<Record<InstallmentNumber, MDREntry>>> = {
    visa: {}, mastercard: {}, elo: {}, amex: {}, hipercard: {},
  };

  for (const brand of BRANDS) {
    const arr = rawTable[brand];
    for (let i = 0; i < 12; i++) {
      const v = arr[i];
      if (v == null) continue;
      const inst = (i + 1) as InstallmentNumber;
      perBrand[brand][inst] = {
        mdrBase: v.toFixed(4),
        anticipationRate: '0.0000',
        finalMdr: v.toFixed(4),
        isManualOverride: false,
      };
    }
  }

  const normalizedCounts = countMatrixFilled(perBrand);
  lg(`stage=normalized counts=${JSON.stringify(normalizedCounts)}`);
  assertStageInvariant('parsed→normalized', parsedCounts, normalizedCounts, logs);

  let matrix = createEmptyMatrix();
  for (const brand of BRANDS) {
    matrix = mergePartialMatrix(
      matrix,
      brand,
      perBrand[brand] as Parameters<typeof mergePartialMatrix>[2]
    );
  }

  // Re-count directly from the final MDRMatrix we're about to send
  const matrixCounts: Record<string, number> = {};
  for (const brand of BRANDS) {
    let c = 0;
    for (let i = 1; i <= 12; i++) {
      const entry = matrix[brand][i as InstallmentNumber];
      if (entry && entry.mdrBase && entry.mdrBase.length > 0) c++;
    }
    matrixCounts[brand] = c;
  }
  lg(`stage=matrix counts=${JSON.stringify(matrixCounts)}`);
  assertStageInvariant('normalized→matrix', normalizedCounts, matrixCounts, logs);

  return NextResponse.json({
    matrix,
    fees: {},
    confidence: 'high' as const,
    confidenceScore: 100,
    missingData: [],
    partial: false,
    debug: {
      logs,
      provider: 'MOCK (no AI)',
      quality: {
        totalFilled: Object.values(matrixCounts).reduce((a, b) => a + b, 0),
        perBrand: matrixCounts,
      },
      rawFull: `MOCK payload — bypasses AI.\n${Object.entries(rawTable)
        .map(([b, a]) => `${b}: [${a.join(', ')}]`)
        .join('\n')}`,
      parsedTable: rawTable,
      stageCounts: {
        raw: rawCounts,
        parsed: parsedCounts,
        normalized: normalizedCounts,
        matrix: matrixCounts,
      },
    },
  });
}

export async function POST() {
  return GET();
}
