import type {
  StrategyProfile,
  SpreadClassification,
  AnalyzerRow,
  AnalyzerMetrics,
  StrategyInsight,
  ExecutionRun,
  BrandKey,
  TransactionMix,
  IntelligentClassification,
  BenchmarkResult,
  RowDetail,
  EnrichedRow,
  SmartSuggestion,
  OptimizationResult,
  OptimizationChange,
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
    competitivo:   'bg-amber-500/20 text-white',
    equilibrado:   'bg-yellow-600/20 text-white',
    agressivo:     'bg-lime-600/[0.18] text-white',
    alta_margem:   'bg-emerald-600/[0.22] text-white',
    maxima_margem: 'bg-green-600/30 text-white',
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

// ─── Intelligence layer ────────────────────────────────────────────────────

// Heuristic market-norm spreads per installment band (Brazilian acquiring market)
export const MARKET_NORM_SPREADS = [
  0.70, 1.20, 1.40, 1.60, 1.80, 2.00,
  2.30, 2.50, 2.70, 2.90, 3.10, 3.40,
];

function getInstVol(idx: number, mix: TransactionMix, monthlyVolume: number): number {
  if (idx === 0) return monthlyVolume * (mix.vista / 100);
  if (idx <= 5)  return monthlyVolume * (mix.short / 100) / 5;
  return          monthlyVolume * (mix.long  / 100) / 6;
}

function computeIntelligentClass(
  row: AnalyzerRow,
  prevRow: AnalyzerRow | null,
  idx: number,
): IntelligentClassification {
  const norm = MARKET_NORM_SPREADS[idx];
  const { spread } = row;
  if (prevRow && spread < prevRow.spread - 0.05) return 'inconsistente';
  if (spread < norm * 0.82)  return 'subprecificado';
  if (spread > norm * 1.35)  return 'risco_comercial';
  if (spread > norm * 1.15)  return 'alta_extracao';
  return 'ideal';
}

export function computeBenchmark(idx: number, spread: number): BenchmarkResult {
  const marketNorm = MARKET_NORM_SPREADS[idx];
  const delta = parseFloat((spread - marketNorm).toFixed(2));
  const abs = Math.abs(delta);
  let label: string;
  if (abs < 0.08) label = 'Dentro do padrão';
  else if (delta < 0) label = `${abs.toFixed(2).replace('.', ',')}% abaixo do mercado`;
  else label = `+${abs.toFixed(2).replace('.', ',')}% acima da média`;
  return { marketNorm, delta, label };
}

export function enrichRows(
  rows: AnalyzerRow[],
  mix: TransactionMix,
  monthlyVolume: number,
  avgTicket: number,
): EnrichedRow[] {
  return rows.map((row, idx) => {
    const prevRow = idx > 0 ? rows[idx - 1] : null;
    const intelligentClass = computeIntelligentClass(row, prevRow, idx);
    const benchmark = computeBenchmark(idx, row.spread);
    const instVol = getInstVol(idx, mix, monthlyVolume);
    const revenueMonthly = Math.round((row.spread / 100) * instVol);
    const revenuePerTx = parseFloat(((row.spread / 100) * avgTicket).toFixed(2));
    const volumeSharePct = parseFloat(((instVol / monthlyVolume) * 100).toFixed(1));
    const norm = MARKET_NORM_SPREADS[idx];

    let suggestion: string | null = null;
    let suggestedSpread: number | null = null;

    if (intelligentClass === 'subprecificado') {
      suggestedSpread = parseFloat((norm * 1.05).toFixed(2));
      const gain = Math.round(((suggestedSpread - row.spread) / 100) * instVol);
      suggestion = `Aumente para ${suggestedSpread.toFixed(2).replace('.', ',')}% → ${fmtCurrency(gain)}/mês a mais`;
    } else if (intelligentClass === 'risco_comercial') {
      suggestedSpread = parseFloat((norm * 1.20).toFixed(2));
      suggestion = `Reduza para ${suggestedSpread.toFixed(2).replace('.', ',')}% para reduzir risco comercial`;
    } else if (intelligentClass === 'inconsistente') {
      const prevSpread = idx > 0 ? rows[idx - 1].spread : 0;
      suggestedSpread = parseFloat((prevSpread + 0.10).toFixed(2));
      suggestion = `Corrija para ${suggestedSpread.toFixed(2).replace('.', ',')}% para manter progressão`;
    }

    const detail: RowDetail = {
      revenueMonthly, revenuePerTx, volumeSharePct,
      benchmark, suggestion, suggestedSpread,
    };
    return { ...row, intelligentClass, detail };
  });
}

export function computeSmartSuggestions(
  enrichedRows: EnrichedRow[],
  mix: TransactionMix,
  monthlyVolume: number,
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  // Subprecificado
  const underpriced = enrichedRows.filter((r) => r.intelligentClass === 'subprecificado');
  if (underpriced.length > 0) {
    const totalGain = underpriced.reduce((sum, r) => {
      const norm = MARKET_NORM_SPREADS[r.installment - 1];
      const instVol = getInstVol(r.installment - 1, mix, monthlyVolume);
      return sum + Math.round(((norm * 1.05 - r.spread) / 100) * instVol);
    }, 0);
    const labels = underpriced.map((r) => r.label).join(', ');
    suggestions.push({
      type: 'opportunity',
      title: `Aumentar spread em ${labels} sem perder competitividade`,
      description: 'Faixas abaixo do mercado com margem disponível não capturada.',
      impact: `+${fmtCurrency(totalGain)}/mês`,
    });
  }

  // Margin concentration in long installments
  const longVol = monthlyVolume * (mix.long / 100) / 6;
  const longRev = enrichedRows.slice(6).reduce((s, r) => s + (r.spread / 100) * longVol, 0);
  const totalRev = enrichedRows.reduce((s, r, i) => s + (r.spread / 100) * getInstVol(i, mix, monthlyVolume), 0);
  const longPct = totalRev > 0 ? Math.round((longRev / totalRev) * 100) : 0;
  if (longPct > 68) {
    suggestions.push({
      type: 'warning',
      title: `Parcelado longo concentra ${longPct}% da sua margem`,
      description: 'Alta dependência de 7x–12x. Risco se o perfil de parcelamento do cliente mudar.',
    });
  }

  // Risco comercial rows
  const risky = enrichedRows.filter((r) => r.intelligentClass === 'risco_comercial');
  if (risky.length > 0) {
    suggestions.push({
      type: 'warning',
      title: `Parcelas ${risky.map((r) => r.label).join(', ')} acima do mercado`,
      description: 'Spread elevado pode reduzir conversão nessas faixas.',
    });
  }

  // Inconsistente progression
  const inconsistent = enrichedRows.filter((r) => r.intelligentClass === 'inconsistente');
  if (inconsistent.length > 0) {
    suggestions.push({
      type: 'info',
      title: `Progressão quebrada em ${inconsistent.map((r) => r.label).join(', ')}`,
      description: 'Spread menor que parcela anterior pode criar inconsistência na proposta.',
    });
  }

  // Short installments subprecificado specifically (when not already covered above)
  if (underpriced.length === 0) {
    const shortUnder = enrichedRows.slice(1, 4).filter((r) => r.intelligentClass === 'subprecificado');
    if (shortUnder.length >= 2) {
      suggestions.push({
        type: 'opportunity',
        title: 'Parcelas curtas subprecificadas',
        description: 'Ajuste em 2x–4x pode aumentar margem com baixo risco comercial.',
      });
    }
  }

  return suggestions.slice(0, 4);
}

export function getIntelligentClassConfig(c: IntelligentClassification): {
  label: string;
  textColor: string;
  bgColor: string;
  dotColor: string;
} {
  const map: Record<IntelligentClassification, { label: string; textColor: string; bgColor: string; dotColor: string }> = {
    subprecificado:  { label: 'Subprecificado',  textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', dotColor: '#22c55e' },
    ideal:           { label: 'Ideal',            textColor: 'text-yellow-300',  bgColor: 'bg-yellow-500/10',  dotColor: '#fde047' },
    risco_comercial: { label: 'Risco comercial',  textColor: 'text-red-400',     bgColor: 'bg-red-500/10',     dotColor: '#f87171' },
    alta_extracao:   { label: 'Alta extração',    textColor: 'text-amber-400',   bgColor: 'bg-amber-500/10',   dotColor: '#fbbf24' },
    inconsistente:   { label: 'Inconsistente',    textColor: 'text-white/40',    bgColor: 'bg-white/5',        dotColor: '#ffffff40' },
  };
  return map[c];
}

export function computeOptimization(
  enrichedRows: EnrichedRow[],
  mix: TransactionMix,
  monthlyVolume: number,
): OptimizationResult {
  const changes: OptimizationChange[] = [];
  const optimizedSpreads: number[] = [];

  enrichedRows.forEach((row, idx) => {
    const norm = MARKET_NORM_SPREADS[idx];
    let newSpread = row.spread;
    let reason = '';

    if (row.intelligentClass === 'subprecificado') {
      newSpread = parseFloat((norm * 1.05).toFixed(2));
      reason = 'Abaixo do mercado — ajustado para referência';
    } else if (row.intelligentClass === 'risco_comercial') {
      newSpread = parseFloat((norm * 1.20).toFixed(2));
      reason = 'Acima do mercado — reduzido para zona segura';
    } else if (row.intelligentClass === 'inconsistente') {
      const prevSpread = optimizedSpreads[idx - 1] ?? 0;
      newSpread = parseFloat(Math.max(row.spread, prevSpread + 0.10).toFixed(2));
      reason = 'Progressão quebrada — corrigido';
    }

    optimizedSpreads.push(newSpread);

    if (Math.abs(newSpread - row.spread) >= 0.01) {
      changes.push({ label: row.label, installmentIdx: idx, oldSpread: row.spread, newSpread, reason });
    }
  });

  const optimizedRows: AnalyzerRow[] = enrichedRows.map((row, idx) => {
    const spread = optimizedSpreads[idx];
    return {
      ...row,
      spread,
      finalRate: parseFloat((row.cost + spread).toFixed(2)),
      classification: row.classification, // preserve visual heatmap class for continuity
    };
  });

  const origRev = enrichedRows.reduce((s, r, i) => s + (r.spread / 100) * getInstVol(i, mix, monthlyVolume), 0);
  const optRev  = optimizedSpreads.reduce((s, sp, i) => s + (sp / 100) * getInstVol(i, mix, monthlyVolume), 0);
  const origAvg = enrichedRows.reduce((s, r) => s + r.spread, 0) / enrichedRows.length;
  const optAvg  = optimizedSpreads.reduce((s, v) => s + v, 0) / optimizedSpreads.length;

  return {
    originalRows: enrichedRows.map((r) => ({ ...r } as AnalyzerRow)),
    optimizedRows,
    optimizedSpreads,
    revenueGain: Math.round(optRev - origRev),
    avgSpreadDelta: parseFloat((optAvg - origAvg).toFixed(2)),
    changes,
  };
}

export function applyCustomSpread(row: AnalyzerRow, newSpread: number): AnalyzerRow {
  return {
    ...row,
    spread: newSpread,
    finalRate: parseFloat((row.cost + newSpread).toFixed(2)),
  };
}
