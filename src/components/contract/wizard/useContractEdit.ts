'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContractData } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';

interface Params {
  contractId:  string;
  getValues:   () => ContractData;
  mdrMatrix:   MDRMatrix;
}

export function useContractEdit({ contractId, getValues, mdrMatrix }: Params) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const data = getValues();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          mdrMatrix: JSON.stringify(mdrMatrix),
        }),
      });
      if (!res.ok) throw new Error('Patch failed');
      router.push(`/contracts/${contractId}`);
      router.refresh();
    } catch {
      alert('Erro ao salvar as alterações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  return { handleSave, isSaving };
}
