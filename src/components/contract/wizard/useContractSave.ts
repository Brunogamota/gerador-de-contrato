'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContractData } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';

interface Params {
  getValues: () => ContractData;
  mdrMatrix: MDRMatrix;
  contractNumber: string;
}

export function useContractSave({ getValues, mdrMatrix, contractNumber }: Params) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const data = getValues();
    setIsSaving(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mdrMatrix, contractNumber }),
      });
      if (!res.ok) throw new Error('Save failed');
      const saved = await res.json();
      router.push(`/contracts/${saved.id}`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar o contrato. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  return { handleSave, isSaving };
}
