export const PROPOSAL_STEPS = [
  { id: 'info',    label: 'Dados do Cliente',   shortLabel: 'Info' },
  { id: 'cost',    label: 'Custo Adquirente',   shortLabel: 'Custo' },
  { id: 'margin',  label: 'Margem Comercial',   shortLabel: 'Margem' },
  { id: 'fees',    label: 'Taxas e Tarifas',    shortLabel: 'Taxas' },
  { id: 'preview', label: 'Prévia da Proposta', shortLabel: 'Prévia' },
] as const;

export type ProposalStepId = (typeof PROPOSAL_STEPS)[number]['id'];
