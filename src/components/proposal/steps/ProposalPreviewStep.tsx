'use client';

import { useState } from 'react';
import { ProposalData } from '@/types/proposal';
import { MDRMatrix, IntlPricing } from '@/types/pricing';
import { ProposalDocument } from '@/components/proposal/ProposalDocument';
import { exportContractToPdf, printContract } from '@/lib/contract/generator';
import { Button } from '@/components/ui/Button';

interface ProposalPreviewStepProps {
  proposalData: ProposalData;
  mdrMatrix: MDRMatrix;
  proposalNumber: string;
  onSave: () => Promise<void>;
  isSaving: boolean;
  intlProposalPricing?: IntlPricing;
  setupIntl?: string;
  saveLabel?: string;
}

export function ProposalPreviewStep({
  proposalData,
  mdrMatrix,
  proposalNumber,
  onSave,
  isSaving,
  intlProposalPricing,
  setupIntl,
  saveLabel = 'Salvar Proposta',
}: ProposalPreviewStepProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportContractToPdf('proposal-document', proposalNumber);
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
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Pré-visualização da Proposta</h2>
          <p className="text-sm text-gray-500">
            Revise a proposta antes de salvar ou exportar
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => printContract('proposal-document')}
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
            {saveLabel}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs text-gray-500 ml-2">Proposta #{proposalNumber}</span>
        </div>
        <div className="overflow-y-auto max-h-[700px]">
          <ProposalDocument
            proposalData={proposalData}
            mdrMatrix={mdrMatrix}
            proposalNumber={proposalNumber}
            intlProposalPricing={intlProposalPricing}
            setupIntl={setupIntl}
          />
        </div>
      </div>
    </div>
  );
}
