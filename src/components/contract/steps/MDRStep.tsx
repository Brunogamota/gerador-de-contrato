'use client';

import { useState } from 'react';
import { MDRMatrix } from '@/types/pricing';
import { MDRGrid } from '@/components/mdr/MDRGrid';
import { validateMatrix } from '@/lib/calculations/validation';
import { cn } from '@/lib/utils';

interface MDRStepProps {
  matrix: MDRMatrix;
  onChange: (matrix: MDRMatrix) => void;
}

export function MDRStep({ matrix, onChange }: MDRStepProps) {
  const validation = validateMatrix(matrix);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Tabela MDR</h2>
          <p className="text-sm text-gray-500">
            Configure as taxas por bandeira e parcela. Clique em qualquer célula para editar. Use{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-mono">Tab</kbd> ou{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-mono">Enter</kbd> para
            avançar rapidamente.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {validation.blendedMdr && (
            <div className="text-right">
              <div className="text-xs text-gray-500">MDR Blended</div>
              <div className="text-xl font-bold text-gray-900 font-mono">
                {parseFloat(validation.blendedMdr).toFixed(2)}%
              </div>
            </div>
          )}
          <div
            className={cn(
              'text-xs px-2 py-1 rounded-full font-medium',
              validation.canGenerateContract
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            )}
          >
            {validation.canGenerateContract ? 'Pronto para contrato' : 'Preencha ao menos uma bandeira completa'}
          </div>
        </div>
      </div>

      <MDRGrid matrix={matrix} onChange={onChange} issues={validation.issues} />

      {/* Global summary */}
      <div className="grid grid-cols-5 gap-2 pt-2">
        {validation.stats.map((stat) => (
          <div
            key={stat.brand}
            className={cn(
              'rounded-lg border p-3 text-center',
              stat.isComplete
                ? 'border-emerald-200 bg-emerald-50'
                : stat.filledCount > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-gray-200 bg-gray-50'
            )}
          >
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {stat.brand === 'visa' ? 'Visa' :
               stat.brand === 'mastercard' ? 'Master' :
               stat.brand === 'elo' ? 'Elo' :
               stat.brand === 'amex' ? 'Amex' : 'Hiper'}
            </div>
            <div className="text-sm font-bold text-gray-900 font-mono">
              {stat.avgMdr ? `${parseFloat(stat.avgMdr).toFixed(2)}%` : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.filledCount}/12</div>
          </div>
        ))}
      </div>
    </div>
  );
}
