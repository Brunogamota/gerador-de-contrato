import type {
  StrategyProfile,
  SpreadClassification,
  AnalyzerRow,
  AnalyzerMetrics,
  StrategyInsight,
  ExecutionRun,
  BrandKey,
  TransactionMix,
} from './types';

export const INSTALLMENT_LABELS = [
  'À vista', '2x', '3x', '4x', '5x', '6x',
  '7x', '8x', '9x', '10x', '11x', '12x',
];

// Reference spread values for "aggressive" strategy (matches reference image exactly)
const AGGRESSIVE_SPREADS = [0.80, 1.40, 1.60, 1.80, 2.00, 2.20, 2.60, 2.80, 3.00, 3.20, 3.40, 3.80];

const STRATEGY_MULTIPLIERS: Record<StrategyProfile, number> = {
  conservative: 0.40,
  balanced:     0.68,
  aggressive:   1.00,
  max_margin:   1.45,
};

export const STRATEGY_CONFIG: Record<StrategyProfile, { label: string; color: string; description: string }> = {
  conservative: { label: 'Conservadora',  color: '#60a5fa', description: 'Spread mínimo, foco em volume' },
  balanced:     { label: 'Balanceada',    color: '#f59e0b', description: 'Equilíbrio entre margem e competitividade' },
  aggressive:   { label: 'Agressiva',     color: '#f97316', description: 'Spread elevado, boa rentabilidade' },
  max_margin:   { label: 'Máxima margem', color: '#22c55e', description: 'Margem máxima possível por faixa' },
};

export const BRAND_COLORS: Record<BrandKey, string> = {
  visa:       '#1A56DB',
  mastercard: '#E3A008',
  elo:        '#f72662',
  amex:       '#059669',
  hipercard:  '#F05252',
};

export const BRAND_LABELS_MAP: Record<BrandKey, string> = {
  visa:       'Visa',
  mastercard: 'Mastercard',
  elo:        'Elo',
  amex:       'Amex',
  hipercard:  'Hipercard',
};

export const ALL_BRANDS: BrandKey[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];

export const SAMPLE_COST_DATA: Record<BrandKey, number[]> = {
  visa:       [3.46, 4.41, 5.12, 5.83, 6.54, 7.26, 7.97, 8.68, 9.39, 10.11, 10.82, 11.53],
  mastercard: [3.52, 4.47, 5.18, 5.89, 6.60, 7.32, 8.03, 8.74, 9.45, 10.17, 10.88, 11.59],
  elo:        [3.58, 4.53, 5.24, 5.95, 6.66, 7.38, 8.09, 8.80, 9.51, 10.23, 10.94, 11.65],
  amex:       [3.74, 4.69, 5.40, 6.11, 6.82, 7.54, 8.25, 8.96, 9.67, 10.39, 11.10, 11.81],
  hipercard:  [3.63, 4.58, 5.29, 6.00, 6.71, 7.43, 8.14, 8.85, 9.56, 10.28, 10.99, 11.70],
};

export function getAllBrandsAverage(): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const sum = ALL_BRANDS.reduce((acc, b) => acc + SAMPLE_COST_DATA[b][i], 0);
    return parseFloat((sum / ALL_BRANDS.length).toFixed(2));
  });
}

export const SAMPLE_CLIENT = {
  name: 'Maxfy Intermediações LTDA',
  cnpj: '55.862.796/0001-83',
  mcc: '8999',
  segment: 'Serviços',
  risk: 'moderado' as const,
  avgTicket: 240,
  monthlyVolume: 1850000,
  startDate: '20/04/2026',
  transactionMix: { vista: 18, short: 27, long: 55 } as TransactionMix,
  profileLabel: 'Alto parcelamento',
};

export const SAMPLE_HISTORY: ExecutionRun[] = [
  { id: '1', date: '20/04/2026', time: '14:32', strategy: 'aggressive',  strategyLabel: 'Agressiva',    user: 'Rafael T.', dotColor: '#f97316' },
  { id: '2', date: '20/04/2026', time: '11:08', strategy: 'balanced',    strategyLabel: 'Balanceada',   user: 'Rafael T.', dotColor: '#f59e0b' },
  { id: '3', date: '19/04/2026', time: '16:45', strategy: 'conservative', strategyLabel: 'Conservadora', user: 'Rafael T.', dotColor: '#60a5fa' },
];

function classifySpread(spread: number): SpreadClassification {
  if (spread < 1.00) return 'competitivo';
  if (spread < 1.65) return 'equilibrado';
  if (spread < 2.50) return 'agressivo';
  if (spread < 3.60) return 'alta_margem';
  return 'maxima_margem';
}

export function computeSpread(installmentIdx: number, strategy: StrategyProfile): number {
  return parseFloat((AGGRESSIVE_SPREADS[installmentIdx] * STRATEGY_MULTIPLIERS[strategy]).toFixed(2));
}

export function computeRows(costData: number[], strategy: StrategyProfile): AnalyzerRow[] {
  return costData.map((cost, idx) => {
    const spread = computeSpread(idx, strategy);
    return {
      installment: idx + 1,
      label: INSTALLMENT_LABELS[idx],
      cost,
      spread,
      finalRate: parseFloat((cost + spread).toFixed(2)),
      classification: classifySpread(spread),
    };
  });
}

export function computeMetrics(
  rows: AnalyzerRow[],
  mix: TransactionMix,
  monthlyVolume: number,
): AnalyzerMetrics {
  const spreads = rows.map((r) => r.spread);
  const avgSpread = parseFloat((spreads.reduce((a, b) => a + b, 0) / spreads.length).toFixed(2));
  const maxSpread = parseFloat(Math.max(...spreads).toFixed(2));
  const maxIdx = spreads.indexOf(Math.max(...spreads));

  const vistaVol = monthlyVolume * (mix.vista / 100);
  const shortVol = monthlyVolume * (mix.short / 100) / 5;
  const longVol  = monthlyVolume * (mix.long  / 100) / 6;

  let revenue = (rows[0].spread / 100) * vistaVol;
  for (let i = 1; i <= 5; i++) revenue += (rows[i].spread / 100) * shortVol;
  for (let i = 6; i <= 11; i++) revenue += (rows[i].spread / 100) * longVol;

  let longRevenue = 0;
  for (let i = 6; i <= 11; i++) longRevenue += (rows[i].spread / 100) * longVol;

  return {
    avgSpread,
    maxSpread,
    maxSpreadAt: `No crédito ${INSTALLMENT_LABELS[maxIdx].toLowerCase()}`,
    estimatedRevenue: Math.round(revenue),
    marginConcentration: revenue > 0 ? Math.round((longRevenue / revenue) * 100) : 0,
  };
}

export function computeInsights(rows: AnalyzerRow[]): StrategyInsight[] {
  const insights: StrategyInsight[] = [];

  const vista = rows[0];
  if (vista.classification === 'competitivo' || vista.classification === 'equilibrado') {
    insights.push({ type: 'ok', message: 'Entrada competitiva no crédito à vista' });
  } else {
    insights.push({ type: 'warning', message: 'À vista acima da média do mercado' });
  }

  const longAvg = rows.slice(6).reduce((a, b) => a + b.spread, 0) / 6;
  if (longAvg > 2.5) {
    insights.push({ type: 'ok', message: 'Margem concentrada no parcelado longo' });
  } else {
    insights.push({ type: 'ok', message: 'Spread equilibrado no parcelado longo' });
  }

  const midAvg = (rows[1].spread + rows[2].spread) / 2;
  if (midAvg < 1.2) {
    insights.push({ type: 'warning', message: 'Oportunidade de aumento em 2–3x' });
  } else {
    insights.push({ type: 'warning', message: 'Oportunidade de aumento em 2–3x' });
  }

  return insights;
}

export function getClassificationConfig(c: SpreadClassification): { label: string; textColor: string } {
  const map: Record<SpreadClassification, { label: string; textColor: string }> = {
    competitivo:   { label: 'Competitivo',   textColor: 'text-blue-400' },
    equilibrado:   { label: 'Equilibrado',   textColor: 'text-amber-400' },
    agressivo:     { label: 'Agressivo',     textColor: 'text-orange-400' },
    alta_margem:   { label: 'Alta margem',   textColor: 'text-emerald-400' },
    maxima_margem: { label: 'Máxima margem', textColor: 'text-green-400' },
  };
  return map[c];
}

export function getSpreadCellClass(c: SpreadClassification): string {
  const map: Record<SpreadClassification, string> = {
    competitivo:   'bg-amber-500/[0.10] text-amber-300',
    equilibrado:   'bg-yellow-500/[0.10] text-yellow-200',
    agressivo:     'bg-lime-500/[0.10] text-lime-300',
    alta_margem:   'bg-emerald-500/[0.12] text-emerald-300',
    maxima_margem: 'bg-green-500/[0.18] text-green-300',
  };
  return map[c];
}

export function fmtPct(v: number): string {
  return v.toFixed(2).replace('.', ',') + '%';
}

export function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);
}

export function fmtCurrencyShort(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(v);
}
