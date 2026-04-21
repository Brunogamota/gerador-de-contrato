import { ProposalWizard } from '@/components/proposal/ProposalWizard';

interface Props {
  searchParams: { tipo?: string };
}

export function generateMetadata({ searchParams }: Props) {
  return {
    title: searchParams.tipo === 'intl'
      ? 'Nova Proposta Internacional · RebornPay'
      : 'Nova Proposta · RebornPay',
  };
}

export default function NewProposalPage({ searchParams }: Props) {
  const tipo = searchParams.tipo === 'intl' ? 'intl'
             : searchParams.tipo === 'both' ? 'both'
             : undefined;

  return <ProposalWizard defaultTipoMercado={tipo} />;
}
