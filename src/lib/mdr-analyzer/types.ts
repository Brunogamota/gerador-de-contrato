export type StrategyProfile = 'conservative' | 'balanced' | 'aggressive' | 'max_margin';

export type SpreadClassification =
  | 'competitivo'
  | 'equilibrado'
  | 'agressivo'
  | 'alta_margem'
  | 'maxima_margem';

export interface AnalyzerRow {
  installment: number;
  label: string;
  cost: number;
  spread: number;
  finalRate: number;
  classification: SpreadClassification;
}

export interface AnalyzerMetrics {
  avgSpread: number;
  maxSpread: number;
  maxSpreadAt: string;
  estimatedRevenue: number;
  marginConcentration: number;
}

export interface TransactionMix {
  vista: number;
  short: number;
  long: number;
}

export interface ClientProfile {
  name: string;
  cnpj: string;
  mcc: string;
  segment: string;
  risk: 'baixo' | 'moderado' | 'alto';
  avgTicket: number;
  monthlyVolume: number;
  startDate: string;
  transactionMix: TransactionMix;
  profileLabel: string;
}

export interface StrategyInsight {
  type: 'ok' | 'warning';
  message: string;
}

export interface ExecutionRun {
  id: string;
  date: string;
  time: string;
  strategy: StrategyProfile;
  strategyLabel: string;
  user: string;
  dotColor: string;
}

export type BrandKey = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard';

// ─── Intelligence layer types ──────────────────────────────────────────────

export type IntelligentClassification =
  | 'subprecificado'    // spread below market — leaving money on the table
  | 'ideal'            // in the competitive-but-profitable sweet spot
  | 'risco_comercial'  // spread above market — conversion risk
  | 'alta_extracao'    // high extraction, slightly above market
  | 'inconsistente';   // breaks installment progression (lower than prev)

export interface BenchmarkResult {
  marketNorm: number;
  delta: number;       // current - norm (positive = above market)
  label: string;       // "0,30% abaixo do mercado" | "Dentro do padrão" | "+0,50% acima da média"
}

export interface RowDetail {
  revenueMonthly: number;   // estimated R$/month from this installment band
  revenuePerTx: number;     // spread revenue per single transaction (R$)
  volumeSharePct: number;   // % of total monthly volume in this band
  benchmark: BenchmarkResult;
  suggestion: string | null;
  suggestedSpread: number | null;
}

export interface EnrichedRow extends AnalyzerRow {
  intelligentClass: IntelligentClassification;
  detail: RowDetail;
}

export interface SmartSuggestion {
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  impact?: string;    // e.g. "+R$ 4.200/mês"
}

export interface OptimizationChange {
  label: string;
  installmentIdx: number;
  oldSpread: number;
  newSpread: number;
  reason: string;
}

export interface OptimizationResult {
  originalRows: AnalyzerRow[];
  optimizedRows: AnalyzerRow[];
  optimizedSpreads: number[];
  revenueGain: number;
  avgSpreadDelta: number;
  changes: OptimizationChange[];
}
