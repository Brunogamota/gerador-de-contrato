'use client';

import { useState } from 'react';

interface ContractActionsProps {
  contractNumber: string;
  documentId?: string;
}

export function ContractActions({ contractNumber, documentId = 'contract-document' }: ContractActionsProps) {
  const [downloading, setDownloading] = useState(false);

  async function handlePrint() {
    const { exportContractToPdf } = await import('@/lib/contract/generator');
    await exportContractToPdf(documentId, contractNumber);
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const { getContractPdfBase64 } = await import('@/lib/contract/generator');
      const base64 = await getContractPdfBase64(documentId);
      const a = document.createElement('a');
      a.href = `data:application/pdf;base64,${base64}`;
      a.download = `${contractNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Erro ao gerar PDF. Tente usar Imprimir.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePrint}
        className="px-4 py-2 rounded-xl text-sm font-medium border border-white/20 bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
      >
        Imprimir
      </button>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand/90 disabled:opacity-50 transition-all shadow-sm"
      >
        {downloading ? (
          <>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Gerando…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar PDF
          </>
        )}
      </button>
    </div>
  );
}
