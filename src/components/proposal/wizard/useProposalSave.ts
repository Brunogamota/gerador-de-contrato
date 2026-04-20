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
  onSuccess?: () => void;
}

export function useProposalSave({
  getValues, mdrMatrix, costTable, marginConfig, clientRates, proposalNumber,
  intlCostPricing, intlProposalPricing, setupIntl, onSuccess,
}: Params) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const data = getValues();
    setIsSaving(true);
    try {
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
      onSuccess?.();
      router.push(`/proposals/${saved.id}`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar a proposta. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  return { handleSave, isSaving };
}
