'use client';

import { useState } from 'react';
import { ContractData } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { ContractDocument } from '@/components/contract/ContractDocument';
import { exportContractToPdf, printContract } from '@/lib/contract/generator';
import { Button } from '@/components/ui/Button';

interface PreviewStepProps {
  contractData: ContractData;
  mdrMatrix: MDRMatrix;
  contractNumber: string;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function PreviewStep({
  contractData,
  mdrMatrix,
  contractNumber,
  onSave,
  isSaving,
}: PreviewStepProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportContractToPdf('contract-document', contractNumber);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Pré-visualização do Contrato</h2>
          <p className="text-sm text-white/50">
            Revise o contrato completo antes de salvar ou exportar
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => printContract('contract-document')}
          >
            Imprimir
          </Button>
          <Button
            variant="outline"
            loading={exporting}
            onClick={handleExportPdf}
          >
            Exportar PDF
          </Button>
          <Button onClick={onSave} loading={isSaving}>
            Salvar Contrato
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <div className="bg-white/[0.03] border-b border-white/[0.08] px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs text-white/40 ml-2">Contrato #{contractNumber}</span>
        </div>
        <div className="overflow-y-auto max-h-[700px]">
          <ContractDocument
            contractData={contractData}
            mdrMatrix={mdrMatrix}
            contractNumber={contractNumber}
          />
        </div>
      </div>
    </div>
  );
}
