export const PROPOSAL_STEPS = [
  { id: 'info',         label: 'Cliente',          shortLabel: 'Cliente'        },
  { id: 'client-rates', label: 'Pricing Atual',    shortLabel: 'Pricing Atual'  },
  { id: 'cost',         label: 'Custos',           shortLabel: 'Custos'         },
  { id: 'pricing',      label: 'Estratégia',       shortLabel: 'Estratégia'     },
  { id: 'fees',         label: 'Taxas',            shortLabel: 'Taxas'          },
  { id: 'preview',      label: 'Prévia',           shortLabel: 'Prévia'         },
] as const;

export type ProposalStepId = (typeof PROPOSAL_STEPS)[number]['id'];

export function getProposalSteps(tipoMercado: 'brasil' | 'intl' | 'both') {
  if (tipoMercado === 'intl') {
    return PROPOSAL_STEPS.filter((s) => ['info', 'cost', 'pricing', 'preview'].includes(s.id));
  }
  return PROPOSAL_STEPS;
}
