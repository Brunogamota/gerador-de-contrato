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
