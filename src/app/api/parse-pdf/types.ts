export type BrandArray = (number | null)[];

export type ParsedTable = {
  meta: {
    anticipation_rate: number;
    rates_include_anticipation: boolean;
    combined_amex_hipercard: boolean;
    confidence: number;
    chargeback_fee: number;
  };
  table: Record<string, BrandArray>;
  source: string;
};

export type QualityReport = {
  valid: boolean;
  totalFilled: number;
  perBrand: Record<string, number>;
  reason?: string;
};
