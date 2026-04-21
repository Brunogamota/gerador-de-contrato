'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProposalData } from '@/types/proposal';
import { MDRMatrix, IntlPricing } from '@/types/pricing';
import { MarginConfig } from '@/lib/pricing/margin';

interface Params {
  getValues: () => ProposalData;
  mdrMatrix: MDRMatrix;
  costTable: MDRMatrix;
  marginConfig: MarginConfig;
  clientRates: MDRMatrix;
  proposalNumber: string;
  intlCostPricing: IntlPricing;
  intlProposalPricing: IntlPricing;
  setupIntl: string;
  editId?: string;
  onSuccess?: () => void;
}

export function useProposalSave({
  getValues, mdrMatrix, costTable, marginConfig, clientRates, proposalNumber,
  intlCostPricing, intlProposalPricing, setupIntl, editId, onSuccess,
}: Params) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const data = getValues();
    setIsSaving(true);
    try {
      let id: string;

      if (editId) {
        // PATCH — send flat fields matching the Prisma schema
        const flatBody = {
          contratanteNome:     data.contratanteNome,
          contratanteCnpj:     data.contratanteCnpj,
          contratanteEndereco: data.contratanteEndereco,
          contratanteEmail:    data.contratanteEmail,
          contratanteTelefone: data.contratanteTelefone,
          repLegalNome:        data.repLegalNome     || null,
          repLegalCpf:         data.repLegalCpf      || null,
          repLegalRg:          data.repLegalRg       || null,
          repLegalEmail:       data.repLegalEmail    || null,
          repLegalTelefone:    data.repLegalTelefone || null,
          repLegalCargo:       data.repLegalCargo    || null,
          mcc:                 data.mcc              || null,
          setup:               data.setup,
          feeTransacao:        data.feeTransacao,
          taxaAntifraude:      data.taxaAntifraude,
          taxaPix:             data.taxaPix,
          taxaPixOut:          data.taxaPixOut,
          taxaSplit:           data.taxaSplit,
          taxaEstorno:         data.taxaEstorno,
          taxaAntecipacao:     data.taxaAntecipacao,
          taxaPreChargeback:   data.taxaPreChargeback,
          taxaChargeback:      data.taxaChargeback,
          prazoRecebimento:    data.prazoRecebimento,
          valorMinimoMensal:   data.valorMinimoMensal,
          validadeAte:         data.validadeAte,
          observacoes:         data.observacoes || '',
          mdrMatrix:           JSON.stringify(mdrMatrix),
          costTable:           JSON.stringify(costTable),
          marginConfig:        JSON.stringify(marginConfig),
          clientRates:         JSON.stringify(clientRates),
          intlCostPricing:     JSON.stringify(intlCostPricing),
          intlProposalPricing: JSON.stringify(intlProposalPricing),
          setupIntl,
        };
        const res = await fetch(`/api/proposals/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(flatBody),
        });
        if (!res.ok) throw new Error('Save failed');
        id = editId;
      } else {
        const res = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data, mdrMatrix, costTable, marginConfig, clientRates, proposalNumber,
            intlCostPricing, intlProposalPricing, setupIntl,
          }),
        });
        if (!res.ok) throw new Error('Save failed');
        const saved = await res.json();
        id = saved.id;
      }

      onSuccess?.();
      router.push(`/proposals/${id}`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar a proposta. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  return { handleSave, isSaving };
}
