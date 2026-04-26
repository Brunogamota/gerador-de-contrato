import { NextRequest, NextResponse } from 'next/server';
import { MDRMatrix, BRANDS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, updateMatrixEntry } from '@/lib/calculations/mdr';
import { identifyHiddenMarginZones, BehavioralAnalysis } from '@/lib/pricing/behavioralModel';
import type { OperationData } from '@/lib/pricing/operationalScore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── MCC classification ────────────────────────────────────────────────────────
type ClientType = 'parcelador' | 'hibrido' | 'a-vista';

const MCC_PARCELADOR = new Set([
  '5045','5065','5732','5734','5251','5211','5261',
  '5712','5713','5714','7032','7033','4722',
  '5122','5047','5511','5521','5531','5571','5599','5941',
  '5621','5631','5641','5651','5661','5699','5611','5691',
]);
const MCC_A_VISTA = new Set([
  '5912','5541','5542','5411','5812','5814','5441','5911',
  '5331','5200','5300','7011','5461','5921','5311',
]);

function classifyClient(mcc: string): ClientType {
  if (MCC_PARCELADOR.has(mcc)) return 'parcelador';
  if (MCC_A_VISTA.has(mcc))    return 'a-vista';
  return 'hibrido';
}

// ── Strategy spread definitions ───────────────────────────────────────────────
//
// These are BASE spreads above cost for the 'hibrido' client type.
// The behavioral model (identifyHiddenMarginZones) replaces the uniform CLIENT_SCALE
// with per-installment multipliers derived from the client's actual operation profile.
//
// When no operationData is provided, CLIENT_SCALE_FALLBACK provides backward compatibility.
//
// Strategy philosophy:
//   low    (Conservador)  — mínima margem viável; maximiza conversão; âncora competitiva
//   medium (Balanceado)   — equilíbrio conversão × margem; spread progressivo
//   high   (Agressivo)    — 1x mantido; concentra captura em 7x–12x
//   max    (Máxima Marg.) — take rate máximo sustentável em todos os bands

interface BandDef { from: number; to: number; spread: number }

const STRATEGY_BANDS: Record<string, BandDef[]> = {
  low: [
    { from: 1,  to: 1,  spread: 0.35 },
    { from: 2,  to: 3,  spread: 0.60 },
    { from: 4,  to: 6,  spread: 0.90 },
    { from: 7,  to: 9,  spread: 1.20 },
    { from: 10, to: 12, spread: 1.50 },
  ],
  medium: [
    { from: 1,  to: 1,  spread: 0.65 },
    { from: 2,  to: 3,  spread: 1.10 },
    { from: 4,  to: 6,  spread: 1.65 },
    { from: 7,  to: 9,  spread: 2.40 },
    { from: 10, to: 12, spread: 3.00 },
  ],
  high: [
    { from: 1,  to: 1,  spread: 0.65 },
    { from: 2,  to: 3,  spread: 1.20 },
    { from: 4,  to: 6,  spread: 2.00 },
    { from: 7,  to: 9,  spread: 3.50 },
    { from: 10, to: 12, spread: 4.50 },
  ],
  max: [
    { from: 1,  to: 1,  spread: 1.10 },
    { from: 2,  to: 3,  spread: 2.00 },
    { from: 4,  to: 6,  spread: 2.90 },
    { from: 7,  to: 9,  spread: 4.50 },
    { from: 10, to: 12, spread: 6.00 },
  ],
};

// Fallback: used when no operationData is provided (MCC-only mode)
const CLIENT_SCALE_FALLBACK: Record<ClientType, number> = {
  parcelador: 1.15,
  hibrido:    1.00,
  'a-vista':  0.80,
};

// Static brand premium fallback (used when no behavioral analysis)
const BRAND_ADJ_FALLBACK: Record<BrandName, number> = {
  visa: 0, mastercard: 0, elo: 0.50, amex: 1.10, hipercard: 0.65,
};

function getBaseSpread(strategy: string, inst: number): number {
  const bands = STRATEGY_BANDS[strategy];
  if (!bands) return 0.50;
  const band = bands.find((b) => inst >= b.from && inst <= b.to);
  return band?.spread ?? 0.50;
}

// ── Matrix builder ────────────────────────────────────────────────────────────
//
// When `analysis` is provided:
//   spread(brand, inst) = baseSpread × installmentMultiplier[inst] + brandPremium[brand]
//
// When `analysis` is null (no operationData):
//   spread(brand, inst) = baseSpread × CLIENT_SCALE_FALLBACK[clientType] + BRAND_ADJ_FALLBACK[brand]
//
// The behavioral multipliers are non-linear across installments — they compress the 1x
// anchor (protect competitiveness) and expand 7–12x based on ticket opacity and
// installment concentration signals.

function buildLevel(
  strategy:   string,
  clientType: ClientType,
  costTable:  MDRMatrix,
  analysis:   BehavioralAnalysis | null,
): MDRMatrix {
  let matrix = createEmptyMatrix();

  for (const brand of BRANDS as BrandName[]) {
    for (const inst of INSTALLMENTS as unknown as InstallmentNumber[]) {
      const costEntry = costTable[brand]?.[inst];
      if (!costEntry?.mdrBase) continue;

      const costFinal  = parseFloat(costEntry.finalMdr || costEntry.mdrBase);
      const baseSpread = getBaseSpread(strategy, inst as number);

      // Behavioral: per-installment multiplier replaces uniform CLIENT_SCALE
      const mult = analysis
        ? (analysis.installmentMultipliers[inst as number] ?? 1.0)
        : CLIENT_SCALE_FALLBACK[clientType];

      // Behavioral: brand premium from analysis, or static fallback
      const brandPrem = analysis
        ? (analysis.brandPremium[brand] ?? 0)
        : BRAND_ADJ_FALLBACK[brand];

      let finalMdr = costFinal + baseSpread * mult + brandPrem;

      // Floor: never below cost + 0.10
      if (finalMdr <= costFinal) finalMdr = costFinal + 0.10;

      const ant     = parseFloat(costEntry.anticipationRate || '0');
      const newBase = Math.max(parseFloat(costEntry.mdrBase), finalMdr - ant);

      matrix = updateMatrixEntry(matrix, brand, inst, 'mdrBase', newBase.toFixed(4));
      matrix = updateMatrixEntry(matrix, brand, inst, 'anticipationRate', ant.toFixed(4));
    }
  }
  return matrix;
}

// ── Validation ────────────────────────────────────────────────────────────────
function warnIfIdentical(levels: Record<string, { matrix: MDRMatrix }>) {
  const keys = Object.keys(levels);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = JSON.stringify(levels[keys[i]].matrix);
      const b = JSON.stringify(levels[keys[j]].matrix);
      if (a === b) {
        console.warn(`[suggest-pricing] WARNING: strategies '${keys[i]}' and '${keys[j]}' are identical — check costTable input`);
      }
    }
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────
const LEVEL_META = {
  low:    { label: 'Conservador',   description: 'Menor taxa viável — prioriza conversão e volume',       color: 'emerald' },
  medium: { label: 'Balanceado',    description: 'Equilíbrio entre conversão e margem',                   color: 'blue'    },
  high:   { label: 'Agressivo',     description: 'Concentra captura de margem em 7x–12x',                 color: 'amber'   },
  max:    { label: 'Máxima Margem', description: 'Take rate máximo sustentável — maior spread por faixa', color: 'rose'    },
};

const RATIONALE_FALLBACK: Record<ClientType, string> = {
  parcelador: 'Perfil parcelador (×1.15): spread concentrado em 7–12x onde a sensibilidade é baixa.',
  hibrido:    'Perfil híbrido (×1.00): spread progressivo com captura crescente no parcelado.',
  'a-vista':  'Perfil transacional (×0.80): spread reduzido — cliente sensível a preço no 1x.',
};

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { costTable, mcc, operationData } = await req.json() as {
      costTable:      MDRMatrix;
      mcc?:           string;
      operationData?: Partial<OperationData>;
    };

    const clientType = classifyClient(mcc ?? '');

    // Run behavioral analysis when operationData is provided.
    // Otherwise fall back to MCC-only CLIENT_SCALE (linear).
    const analysis = operationData
      ? identifyHiddenMarginZones(operationData as OperationData)
      : null;

    if (analysis) {
      console.log('[suggest-pricing] behavioral mode — zones:', analysis.zones.map((z) => z.id).join(', '));
    } else {
      console.log('[suggest-pricing] linear mode (no operationData) — clientType:', clientType);
    }

    const levels = Object.fromEntries(
      Object.entries(LEVEL_META).map(([key, meta]) => [
        key,
        { ...meta, matrix: buildLevel(key, clientType, costTable, analysis) },
      ]),
    );

    warnIfIdentical(levels as Record<string, { matrix: MDRMatrix }>);

    return NextResponse.json({
      levels,
      rationale:         analysis?.summary ?? RATIONALE_FALLBACK[clientType],
      zones:             analysis?.zones ?? [],
      behavioralActive:  !!analysis,
    });
  } catch (err) {
    console.error('[suggest-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao calcular pricing' }, { status: 500 });
  }
}
