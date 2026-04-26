import { NextRequest, NextResponse } from 'next/server';
import { MDRMatrix, BRANDS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, updateMatrixEntry } from '@/lib/calculations/mdr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── Client classification by MCC ──────────────────────────────────────────────
type ClientType = 'parcelador' | 'hibrido' | 'a-vista';

const MCC_PARCELADOR = new Set([
  '5045','5065','5732','5734','5065','5251','5211','5261',
  '5712','5713','5714','5065','7011','7032','7033','4722',
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

// ── Spread ranges by client type and installment band ─────────────────────────
interface Band { from: number; to: number; min: number; max: number }

const SPREAD_RANGES: Record<ClientType, Band[]> = {
  parcelador: [
    { from: 1,  to: 1,  min: 0.50, max: 1.00 },
    { from: 2,  to: 3,  min: 1.20, max: 2.00 },
    { from: 4,  to: 6,  min: 2.00, max: 3.00 },
    { from: 7,  to: 9,  min: 3.50, max: 4.50 },
    { from: 10, to: 12, min: 4.50, max: 6.50 },
  ],
  hibrido: [
    { from: 1,  to: 1,  min: 0.80, max: 1.50 },
    { from: 2,  to: 3,  min: 1.50, max: 2.00 },
    { from: 4,  to: 6,  min: 2.00, max: 2.80 },
    { from: 7,  to: 9,  min: 2.80, max: 3.50 },
    { from: 10, to: 12, min: 3.50, max: 4.50 },
  ],
  'a-vista': [
    { from: 1,  to: 1,  min: 0.30, max: 0.80 },
    { from: 2,  to: 3,  min: 1.00, max: 1.50 },
    { from: 4,  to: 6,  min: 1.50, max: 2.00 },
    { from: 7,  to: 9,  min: 2.00, max: 2.80 },
    { from: 10, to: 12, min: 2.80, max: 3.50 },
  ],
};

const BRAND_ADJ: Record<BrandName, number> = {
  visa: 0, mastercard: 0, elo: 0.50, amex: 1.10, hipercard: 0.65,
};

// level fraction: 0 = min spread, 1 = max spread
const LEVEL_FRACTIONS: Record<string, number> = {
  low: 0.0, medium: 0.35, high: 0.70, max: 1.0,
};

function getSpread(inst: number, type: ClientType, fraction: number): number {
  const band = SPREAD_RANGES[type].find((b) => inst >= b.from && inst <= b.to);
  if (!band) return 0.5;
  return band.min + (band.max - band.min) * fraction;
}

function buildLevel(
  levelKey: string,
  clientType: ClientType,
  costTable: MDRMatrix,
  clientRates: MDRMatrix,
): MDRMatrix {
  const fraction = LEVEL_FRACTIONS[levelKey] ?? 0.5;
  let matrix = createEmptyMatrix();

  for (const brand of BRANDS as BrandName[]) {
    const brandAdj = BRAND_ADJ[brand];
    for (const inst of INSTALLMENTS as unknown as InstallmentNumber[]) {
      const costEntry = costTable[brand]?.[inst];
      if (!costEntry?.mdrBase) continue;

      const costFinal  = parseFloat(costEntry.finalMdr || costEntry.mdrBase);
      const spread     = getSpread(inst as number, clientType, fraction) + brandAdj;
      let   finalMdr   = costFinal + spread;

      // Must stay below client rate if provided
      const clientEntry = clientRates?.[brand]?.[inst];
      if (clientEntry?.finalMdr) {
        const clientFinal = parseFloat(clientEntry.finalMdr);
        if (finalMdr >= clientFinal) {
          finalMdr = clientFinal * 0.97; // 3% below client rate
        }
      }

      // Never below cost
      if (finalMdr <= costFinal) finalMdr = costFinal + 0.20;

      const ant     = parseFloat(costEntry.anticipationRate || '0');
      const newBase = Math.max(parseFloat(costEntry.mdrBase), finalMdr - ant);

      matrix = updateMatrixEntry(matrix, brand, inst, 'mdrBase', newBase.toFixed(4));
      matrix = updateMatrixEntry(matrix, brand, inst, 'anticipationRate', ant.toFixed(4));
    }
  }
  return matrix;
}

const LEVEL_META = {
  low:    { label: 'Conservador',   description: 'Entrada competitiva — prioriza conversão',     color: 'emerald' },
  medium: { label: 'Balanceado',    description: 'Equilíbrio ótimo conversão × margem',           color: 'blue'    },
  high:   { label: 'Agressivo',     description: 'Margem estruturada — concentrada no parcelado', color: 'amber'   },
  max:    { label: 'Máxima margem', description: 'Take rate máximo sustentável por segmento',     color: 'rose'    },
};

const RATIONALE: Record<ClientType, string> = {
  parcelador: '[PARCELADOR] Alto índice de parcelamento. Margem concentrada em 7–12x onde a sensibilidade de preço é mínima.',
  hibrido:    '[HÍBRIDO] Perfil misto. Spread distribuído progressivamente com maior captura no parcelado médio-longo.',
  'a-vista':  '[À VISTA] Cliente transacional. Spread reduzido no à vista, progressão gradual no parcelado.',
};

export async function POST(req: NextRequest) {
  try {
    const { costTable, clientRates, mcc } = await req.json() as {
      costTable: MDRMatrix;
      clientRates?: MDRMatrix;
      mcc?: string;
    };

    const clientType = classifyClient(mcc ?? '');

    const levels = Object.fromEntries(
      Object.entries(LEVEL_META).map(([key, meta]) => [
        key,
        {
          ...meta,
          matrix: buildLevel(key, clientType, costTable, clientRates ?? createEmptyMatrix()),
        },
      ]),
    );

    return NextResponse.json({ levels, rationale: RATIONALE[clientType] });
  } catch (err) {
    console.error('[suggest-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao calcular pricing' }, { status: 500 });
  }
}
