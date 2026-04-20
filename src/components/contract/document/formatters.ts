import { MDRMatrix, BrandName, InstallmentNumber } from '@/types/pricing';

export const TD = 'border border-gray-400 px-2 py-1 text-xs';
export const TH = `${TD} font-semibold bg-gray-100`;

export function mdrVal(matrix: MDRMatrix, brand: BrandName, inst: number): string {
  const v = matrix[brand][inst as InstallmentNumber]?.finalMdr;
  return v ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '-';
}

export function cur(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}
