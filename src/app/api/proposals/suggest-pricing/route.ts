import { NextRequest, NextResponse } from 'next/server';
import { MDRMatrix, BRANDS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, updateMatrixEntry } from '@/lib/calculations/mdr';

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
// Spreads in percentage points above cost, defined explicitly per installment
// band and per strategy.  These are BASE values for client type 'hibrido'.
// Parcelador scales up (×1.15), À-vista scales down (×0.80).
//
// Strategy philosophy:
//   low    (Conservador)  — mínima margem viável, maximiza conversão
//   medium (Balanceado)   — equilíbrio conversão × margem
//   high   (Agressivo)    — concentra margem no parcelado 7x–12x
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
    { from: 1,  to: 1,  spread: 0.65 },   // 1x mantido competitivo
    { from: 2,  to: 3,  spread: 1.20 },
    { from: 4,  to: 6,  spread: 2.00 },
    { from: 7,  to: 9,  spread: 3.50 },   // captura de margem concentrada aqui
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

// MCC-based multiplier applied on top of base spreads
const CLIENT_SCALE: Record<ClientType, number> = {
  parcelador: 1.15,
  hibrido:    1.00,
  'a-vista':  0.80,
};

// Brand premium over Visa/Mastercard (pp)
const BRAND_ADJ: Record<BrandName, number> = {
  visa: 0, mastercard: 0, elo: 0.50, amex: 1.10, hipercard: 0.65,
};

function getSpread(strategy: string, inst: number, clientType: ClientType): number {
  const bands = STRATEGY_BANDS[strategy];
  if (!bands) return 0.50;
  const band = bands.find((b) => inst >= b.from && inst <= b.to);
  const base = band?.spread ?? 0.50;
  return +(base * CLIENT_SCALE[clientType]).toFixed(4);
}

function buildLevel(strategy: string, clientType: ClientType, costTable: MDRMatrix): MDRMatrix {
  let matrix = createEmptyMatrix();

  for (const brand of BRANDS as BrandName[]) {
    for (const inst of INSTALLMENTS as unknown as InstallmentNumber[]) {
      const costEntry = costTable[brand]?.[inst];
      if (!costEntry?.mdrBase) continue;

      const costFinal = parseFloat(costEntry.finalMdr || costEntry.mdrBase);
      const spread    = getSpread(strategy, inst as number, clientType) + BRAND_ADJ[brand];
      let   finalMdr  = costFinal + spread;

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
  high:   { label: 'Agressivo',     description: 'Concentra margem no parcelado 7x–12x',                  color: 'amber'   },
  max:    { label: 'Máxima Margem', description: 'Take rate máximo sustentável — maior spread por faixa', color: 'rose'    },
};

const RATIONALE: Record<ClientType, string> = {
  parcelador: 'Perfil parcelador (escala ×1.15): spread concentrado em 7–12x onde a sensibilidade é baixa.',
  hibrido:    'Perfil híbrido (escala ×1.00): spread progressivo com captura crescente no parcelado.',
  'a-vista':  'Perfil transacional (escala ×0.80): spread reduzido — cliente sensível a preço no 1x.',
};

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { costTable, mcc } = await req.json() as {
      costTable: MDRMatrix;
      mcc?: string;
    };

    const clientType = classifyClient(mcc ?? '');

    const levels = Object.fromEntries(
      Object.entries(LEVEL_META).map(([key, meta]) => [
        key,
        { ...meta, matrix: buildLevel(key, clientType, costTable) },
      ]),
    );

    warnIfIdentical(levels as Record<string, { matrix: MDRMatrix }>);

    return NextResponse.json({ levels, rationale: RATIONALE[clientType] });
  } catch (err) {
    console.error('[suggest-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao calcular pricing' }, { status: 500 });
  }
}
