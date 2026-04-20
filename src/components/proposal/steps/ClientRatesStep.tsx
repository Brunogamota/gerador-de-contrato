'use client';

import { useState } from 'react';
import { MDRMatrix } from '@/types/pricing';
import { MDRGrid } from '@/components/mdr/MDRGrid';
import { PDFImportModal } from '@/components/mdr/PDFImportModal';
import { validateMatrix } from '@/lib/calculations/validation';
import { cn } from '@/lib/utils';

interface ClientRatesStepProps {
  matrix: MDRMatrix;
  onChange: (matrix: MDRMatrix) => void;
}

export function ClientRatesStep({ matrix, onChange }: ClientRatesStepProps) {
  const [showImport, setShowImport] = useState(false);
  const [inputMode, setInputMode] = useState<'photo' | 'manual'>('photo');
  const validation = validateMatrix(matrix);
  const hasData = validation.stats.some((s) => s.filledCount > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-ink-950 mb-1">Taxa Atual do Cliente</h2>
          <p className="text-sm text-ink-500">
            Informe o que o cliente paga hoje. Usado para calcular o saving e orientar sua proposta.{' '}
            <span className="font-semibold text-amber-600">Nunca visível ao cliente.</span>
          </p>
        </div>

        {hasData && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            ✓ Taxas informadas
          </span>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('photo')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
            inputMode === 'photo'
              ? 'bg-brand text-white border-brand shadow-sm'
              : 'bg-white text-ink-700 border-ink-200 hover:border-brand/40',
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
          Importar foto / PDF com IA
        </button>
        <button
          onClick={() => setInputMode('manual')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
            inputMode === 'manual'
              ? 'bg-brand text-white border-brand shadow-sm'
              : 'bg-white text-ink-700 border-ink-200 hover:border-brand/40',
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Preencher manualmente
        </button>
      </div>

      {inputMode === 'photo' ? (
        <div className="flex flex-col items-center justify-center gap-5 py-8 px-6 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-800 mb-1">
              Envie a foto da taxa atual do cliente
            </p>
            <p className="text-xs text-ink-500">
              A IA extrai automaticamente as taxas por bandeira e parcela
            </p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-700 shadow-sm transition-all"
          >
            Selecionar arquivo
          </button>
          {hasData && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ Tabela importada — você pode ajustar manualmente se necessário
            </p>
          )}
        </div>
      ) : (
        <MDRGrid matrix={matrix} onChange={onChange} issues={validation.issues} />
      )}

      {hasData && inputMode === 'photo' && (
        <div className="rounded-xl border border-ink-200 overflow-hidden">
          <button
            onClick={() => setInputMode('manual')}
            className="w-full px-4 py-3 text-left text-sm text-ink-500 hover:bg-ink-50 hover:text-ink-700 transition-colors flex items-center justify-between"
          >
            <span>Ver / editar tabela importada</span>
            <span>→</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 text-xs text-ink-500">
        <svg className="w-4 h-4 flex-shrink-0 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Este campo é opcional. Se não informado, a IA usará benchmarks de mercado para o MCC do cliente.
      </div>

      {showImport && (
        <PDFImportModal
          currentMatrix={matrix}
          onConfirm={(m) => { onChange(m); setShowImport(false); setInputMode('manual'); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
