export const STEPS = [
  { id: 'client', label: 'Dados do Contratante', shortLabel: 'Cliente' },
  { id: 'mdr', label: 'Tabela MDR', shortLabel: 'MDR' },
  { id: 'fees', label: 'Taxas e Tarifas', shortLabel: 'Taxas' },
  { id: 'preview', label: 'Revisão e Geração', shortLabel: 'Prévia' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];
