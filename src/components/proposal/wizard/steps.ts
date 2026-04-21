export const PROPOSAL_STEPS = [
  { id: 'info',         label: 'Dados do Cliente',   shortLabel: 'Info' },
  { id: 'cost',         label: 'Custo Adquirente',   shortLabel: 'Custo' },
  { id: 'client-rates', label: 'Taxa do Cliente',    shortLabel: 'Cliente' },
  { id: 'pricing',      label: 'Precificação',       shortLabel: 'Pricing' },
  { id: 'fees',         label: 'Taxas e Tarifas',    shortLabel: 'Taxas' },
  { id: 'preview',      label: 'Prévia da Proposta', shortLabel: 'Prévia' },
] as const;

export type ProposalStepId = (typeof PROPOSAL_STEPS)[number]['id'];

export function getProposalSteps(tipoMercado: 'brasil' | 'intl' | 'both') {
  if (tipoMercado === 'intl') {
    return PROPOSAL_STEPS.filter((s) => ['info', 'cost', 'pricing', 'preview'].includes(s.id));
  }
  return PROPOSAL_STEPS;
}
