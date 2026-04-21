'use client';

import { ProposalData } from '@/types/proposal';
import { MDRMatrix, IntlPricing } from '@/types/pricing';
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
  intlProposalPricing?: IntlPricing;
  setupIntl?: string;
}

export function ProposalDocument({
  proposalData: d, mdrMatrix, proposalNumber, intlProposalPricing, setupIntl,
}: ProposalDocumentProps) {
  const hasIntl = !!(intlProposalPricing?.processingRate);

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

      {/* Brief company intro */}
      <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#fafafa', borderLeft: '3px solid #f72662', borderRadius: '0 6px 6px 0' }}>
        <p style={{ fontSize: '10px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
          A <strong>RebornPay</strong> é uma empresa especializada em infraestrutura de pagamentos, oferecendo
          soluções completas de adquirência, processamento e liquidação financeira para negócios que exigem
          performance, segurança e flexibilidade operacional. Esta proposta foi preparada exclusivamente para{' '}
          <strong>{d.contratanteNome}</strong> e contempla as condições comerciais negociadas para o período de validade indicado.
        </p>
      </div>
      <ProposalClientSummary d={d} />
      <ProposalPricingSection
        d={d}
        mdrMatrix={mdrMatrix}
        intlProposalPricing={intlProposalPricing}
        setupIntl={setupIntl}
      />
      <ProposalConditions observacoes={d.observacoes} hasIntlPricing={hasIntl} />
      <ProposalSignatureBlock d={d} />
    </div>
  );
}
