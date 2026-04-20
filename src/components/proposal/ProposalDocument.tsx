'use client';

import { ProposalData } from '@/types/proposal';
import { MDRMatrix } from '@/types/pricing';
import { ContractLetterhead } from '@/components/contract/ContractLetterhead';
import { ProposalHeader } from './document/ProposalHeader';
import { ProposalClientSummary } from './document/ProposalClientSummary';
import { ProposalPricingSection } from './document/ProposalPricingSection';
import { ProposalConditions } from './document/ProposalConditions';
import { ProposalSignatureBlock } from './document/ProposalSignatureBlock';

interface ProposalDocumentProps {
  proposalData: ProposalData;
  mdrMatrix: MDRMatrix;
  proposalNumber: string;
}

export function ProposalDocument({ proposalData: d, mdrMatrix, proposalNumber }: ProposalDocumentProps) {
  return (
    <div
      id="proposal-document"
      className="bg-white text-ink-950 leading-relaxed p-10 max-w-4xl mx-auto"
      style={{
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: '10pt',
        lineHeight: '1.55',
      }}
    >
      <ContractLetterhead />

      <ProposalHeader proposalNumber={proposalNumber} validadeAte={d.validadeAte} />
      <ProposalClientSummary d={d} />
      <ProposalPricingSection d={d} mdrMatrix={mdrMatrix} />
      <ProposalConditions observacoes={d.observacoes} />
      <ProposalSignatureBlock d={d} />
    </div>
  );
}
