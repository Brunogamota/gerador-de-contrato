'use client';

import { useState } from 'react';
import { MDRMatrix } from '@/types/pricing';
import { MDRGrid } from '@/components/mdr/MDRGrid';
import { PDFImportModal } from '@/components/mdr/PDFImportModal';
import { validateMatrix } from '@/lib/calculations/validation';
import { cn } from '@/lib/utils';

interface MDRStepProps {
  matrix: MDRMatrix;
  onChange: (matrix: MDRMatrix) => void;
}

export function MDRStep({ matrix, onChange }: MDRStepProps) {
  const [showImport, setShowImport] = useState(false);
  const validation = validateMatrix(matrix);

  function handleImportConfirm(imported: MDRMatrix) {
    onChange(imported);
    setShowImport(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-ink-950 mb-1">Tabela MDR</h2>
          <p className="text-sm text-ink-500">
            Configure as taxas por bandeira e parcela.{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-xs font-mono text-ink-600">Tab</kbd>{' '}
            ou{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-xs font-mono text-ink-600">Enter</kbd>{' '}
            para avançar entre células.
          </p>
        </div>

        {/* Right: metrics + import button */}
        <div className="flex items-center gap-4 flex-wrap">
          {validation.blendedMdr && (
            <div className="text-right">
              <div className="text-xs text-ink-500 font-medium uppercase tracking-wide">MDR Blended</div>
              <div className="text-2xl font-bold text-ink-950 font-mono">
                {parseFloat(validation.blendedMdr).toFixed(2)}%
              </div>
            </div>
          )}

          {/* AI Import button */}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand/30 bg-brand-50 text-brand text-sm font-semibold hover:bg-brand-100 hover:border-brand/50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
            Importar Proposta (IA)
          </button>

          {/* Status badge */}
          <div className={cn(
            'text-xs px-3 py-1.5 rounded-full font-semibold',
            validation.canGenerateContract
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-ink-100 text-ink-500'
          )}>
            {validation.canGenerateContract ? '✓ Pronto' : 'Preencha ao menos 1 bandeira'}
          </div>
        </div>
      </div>

      {/* MDR Grid */}
      <MDRGrid matrix={matrix} onChange={onChange} issues={validation.issues} />

      {/* Brand summary grid */}
      <div className="grid grid-cols-5 gap-2 pt-2">
        {validation.stats.map((stat) => (
          <div
            key={stat.brand}
            className={cn(
              'rounded-xl border p-3 text-center transition-colors',
              stat.isComplete
                ? 'border-emerald-200 bg-emerald-50'
                : stat.filledCount > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-ink-100 bg-ink-50'
            )}
          >
            <div className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1">
              {stat.brand === 'mastercard' ? 'Master' : stat.brand.charAt(0).toUpperCase() + stat.brand.slice(1)}
            </div>
            <div className="text-sm font-bold text-ink-900 font-mono">
              {stat.avgMdr ? `${parseFloat(stat.avgMdr).toFixed(2)}%` : '—'}
            </div>
            <div className="text-xs text-ink-400 mt-0.5">{stat.filledCount}/12</div>
          </div>
        ))}
      </div>

      {/* Import modal */}
      {showImport && (
        <PDFImportModal
          currentMatrix={matrix}
          onConfirm={handleImportConfirm}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
