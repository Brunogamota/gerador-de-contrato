export type BrandName = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard';

export const BRANDS: BrandName[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];

export const BRAND_LABELS: Record<BrandName, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'Amex',
  hipercard: 'Hipercard',
};

export const BRAND_COLORS: Record<BrandName, string> = {
  visa: '#1A1F71',
  mastercard: '#EB001B',
  elo: '#003087',
  amex: '#007BC1',
  hipercard: '#CC092F',
};

export const INSTALLMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type InstallmentNumber = (typeof INSTALLMENTS)[number];

export interface MDREntry {
  mdrBase: string;
  anticipationRate: string;
  finalMdr: string;
  isManualOverride: boolean;
}

export type BrandMatrix = {
  [K in InstallmentNumber]: MDREntry;
};

export type MDRMatrix = {
  [B in BrandName]: BrandMatrix;
};

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  brand?: BrandName;
  installment?: number;
  message: string;
  code: string;
}

export interface BrandStats {
  brand: BrandName;
  avgMdr: string;
  minMdr: string;
  maxMdr: string;
  isComplete: boolean;
  filledCount: number;
}

export interface MDRValidationResult {
  isValid: boolean;
  canGenerateContract: boolean;
  issues: ValidationIssue[];
  stats: BrandStats[];
  blendedMdr: string;
}

export interface ParsedPDFRate {
  brand: BrandName;
  installmentFrom: number;
  installmentTo: number;
  mdrBase: string;
  anticipationRate?: string;
  source: string;
}
