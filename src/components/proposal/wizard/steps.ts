export const PROPOSAL_STEPS = [
  { id: 'info',    label: 'Dados e Validade',    shortLabel: 'Info' },
  { id: 'mdr',     label: 'Tabela MDR',           shortLabel: 'MDR' },
  { id: 'fees',    label: 'Taxas e Tarifas',      shortLabel: 'Taxas' },
  { id: 'preview', label: 'Prévia da Proposta',   shortLabel: 'Prévia' },
] as const;

export type ProposalStepId = (typeof PROPOSAL_STEPS)[number]['id'];
