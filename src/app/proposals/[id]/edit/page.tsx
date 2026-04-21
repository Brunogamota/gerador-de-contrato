'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProposalWizard, ProposalInitialData } from '@/components/proposal/ProposalWizard';
import { ProposalData, DEFAULT_PROPOSAL_DATA } from '@/types/proposal';
import { MDRMatrix, IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';
import { MarginConfig, DEFAULT_MARGIN_CONFIG } from '@/lib/pricing/margin';
import { createEmptyMatrix } from '@/lib/calculations/mdr';

export default function ProposalEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [initialData, setInitialData] = useState<ProposalInitialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proposals/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((proposal) => {
        const formData: ProposalData = {
          ...DEFAULT_PROPOSAL_DATA,
          contratanteNome:     proposal.contratanteNome,
          contratanteCnpj:     proposal.contratanteCnpj,
          contratanteEndereco: proposal.contratanteEndereco,
          contratanteEmail:    proposal.contratanteEmail,
          contratanteTelefone: proposal.contratanteTelefone,
          repLegalNome:        proposal.repLegalNome     ?? '',
          repLegalCpf:         proposal.repLegalCpf      ?? '',
          repLegalRg:          proposal.repLegalRg       ?? '',
          repLegalEmail:       proposal.repLegalEmail    ?? '',
          repLegalTelefone:    proposal.repLegalTelefone ?? '',
          repLegalCargo:       proposal.repLegalCargo    ?? '',
          mcc:                 proposal.mcc              ?? '',
          setup:               proposal.setup,
          feeTransacao:        proposal.feeTransacao,
          taxaAntifraude:      proposal.taxaAntifraude,
          taxaPix:             proposal.taxaPix,
          taxaPixOut:          proposal.taxaPixOut,
          taxaSplit:           proposal.taxaSplit,
          taxaEstorno:         proposal.taxaEstorno,
          taxaAntecipacao:     proposal.taxaAntecipacao,
          taxaPreChargeback:   proposal.taxaPreChargeback,
          taxaChargeback:      proposal.taxaChargeback,
          prazoRecebimento:    proposal.prazoRecebimento,
          valorMinimoMensal:   proposal.valorMinimoMensal,
          validadeAte:         proposal.validadeAte,
          observacoes:         proposal.observacoes ?? '',
          dataInicio:          DEFAULT_PROPOSAL_DATA.dataInicio,
          vigenciaMeses:       DEFAULT_PROPOSAL_DATA.vigenciaMeses,
          foro:                DEFAULT_PROPOSAL_DATA.foro,
        };

        function parse<T>(json: string | null | undefined, fallback: T): T {
          try { return json ? JSON.parse(json) as T : fallback; } catch { return fallback; }
        }

        setInitialData({
          formData,
          mdrMatrix:           parse<MDRMatrix>(proposal.mdrMatrix,           createEmptyMatrix()),
          costTable:           parse<MDRMatrix>(proposal.costTable,           createEmptyMatrix()),
          clientRates:         parse<MDRMatrix>(proposal.clientRates,         createEmptyMatrix()),
          marginConfig:        parse<MarginConfig>(proposal.marginConfig,     DEFAULT_MARGIN_CONFIG),
          intlCostPricing:     parse<IntlPricing>(proposal.intlCostPricing,   DEFAULT_INTL_PRICING),
          intlProposalPricing: parse<IntlPricing>(proposal.intlProposalPricing, DEFAULT_INTL_PRICING),
          setupIntl:           proposal.setupIntl ?? '0.00',
          proposalNumber:      proposal.proposalNumber,
        });
      })
      .catch(() => router.push('/proposals'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-ink-400 text-sm">Carregando proposta...</p>
      </div>
    );
  }

  if (!initialData) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href={`/proposals/${params.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para a proposta
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">Editar</span>
      </div>

      <ProposalWizard initialData={initialData} editId={params.id} />
    </div>
  );
}
