import { MDRMatrix, BrandName, InstallmentNumber } from '@/types/pricing';

export const TD = 'border border-gray-400 px-2 py-1 text-xs';
export const TH = `${TD} font-semibold bg-gray-100`;

export const INSTALLMENT_LABELS: Record<number, string> = {
  1:  'Crédito à Vista',
  2:  'Crédito Parcelado (2 vezes)',
  3:  'Crédito Parcelado (3 vezes)',
  4:  'Crédito Parcelado (4 vezes)',
  5:  'Crédito Parcelado (5 vezes)',
  6:  'Crédito Parcelado (6 vezes)',
  7:  'Crédito Parcelado (7 vezes)',
  8:  'Crédito Parcelado (8 vezes)',
  9:  'Crédito Parcelado (9 vezes)',
  10: 'Crédito Parcelado (10 vezes)',
  11: 'Crédito Parcelado (11 vezes)',
  12: 'Crédito Parcelado (12 vezes)',
};

export function mdrVal(matrix: MDRMatrix, brand: BrandName, inst: number): string {
  const v = matrix[brand][inst as InstallmentNumber]?.finalMdr;
  return v ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '-';
}

export function mdrBaseStr(matrix: MDRMatrix, brand: BrandName, inst: number): string {
  const v = matrix[brand][inst as InstallmentNumber]?.mdrBase;
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')} %` : '-';
}

export function mdrAntStr(matrix: MDRMatrix, brand: BrandName, inst: number): string {
  const v = matrix[brand][inst as InstallmentNumber]?.anticipationRate;
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')} %` : '-';
}

export function mdrFinalStr(matrix: MDRMatrix, brand: BrandName, inst: number): string {
  const v = matrix[brand][inst as InstallmentNumber]?.finalMdr;
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')} %` : '-';
}

export function cur(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}
