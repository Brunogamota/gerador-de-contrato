'use client';

import { useCallback, useRef, useState, KeyboardEvent, useEffect } from 'react';
import {
  BrandName,
  BRANDS,
  BRAND_LABELS,
  INSTALLMENTS,
  InstallmentNumber,
  MDRMatrix,
  ValidationIssue,
} from '@/types/pricing';
import {
  updateMatrixEntry,
  applyBulkRate,
  calculateBrandAverage,
  normalizeMdrInput,
} from '@/lib/calculations/mdr';
import { getCellSeverity, validateMatrix } from '@/lib/calculations/validation';
import { cn } from '@/lib/utils';

interface CellId {
  brand: BrandName;
  installment: number;
  field: 'mdrBase' | 'anticipationRate' | 'finalMdr';
}

interface MDRGridProps {
  matrix: MDRMatrix;
  onChange: (matrix: MDRMatrix) => void;
  issues?: ValidationIssue[];
  readOnly?: boolean;
}

const CELL_FIELDS: CellId['field'][] = ['mdrBase', 'anticipationRate', 'finalMdr'];
const FIELD_LABELS: Record<CellId['field'], string> = {
  mdrBase: 'Base',
  anticipationRate: 'Ant.',
  finalMdr: 'Final',
};

export function MDRGrid({ matrix, onChange, issues = [], readOnly = false }: MDRGridProps) {
  const [selectedBrand, setSelectedBrand] = useState<BrandName>('visa');
  const [focusedCell, setFocusedCell] = useState<CellId | null>(null);
  const [editingCell, setEditingCell] = useState<CellId | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bulkModal, setBulkModal] = useState<{ brand: BrandName; field: 'mdrBase' | 'anticipationRate' } | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validation = validateMatrix(matrix);

  const currentBrandStats = validation.stats.find((s) => s.brand === selectedBrand);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  function getCellValue(brand: BrandName, installment: number, field: CellId['field']): string {
    const entry = matrix[brand][installment as InstallmentNumber];
    return entry[field] ?? '';
  }

  function startEdit(brand: BrandName, installment: number, field: CellId['field']) {
    if (readOnly || field === 'finalMdr') return;
    const value = getCellValue(brand, installment, field);
    setEditingCell({ brand, installment, field });
    setEditValue(value);
  }

  function commitEdit() {
    if (!editingCell) return;
    const { brand, installment, field } = editingCell;
    if (field !== 'finalMdr') {
      const normalized = editValue === '' ? '' : normalizeMdrInput(editValue) || editValue;
      onChange(updateMatrixEntry(matrix, brand, installment as InstallmentNumber, field, normalized));
    }
    setEditingCell(null);
    setEditValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      // Move to next cell
      if (editingCell) {
        const { brand, installment, field } = editingCell;
        const fieldIdx = CELL_FIELDS.indexOf(field);
        if (field === 'mdrBase') {
          startEdit(brand, installment, 'anticipationRate');
        } else if (field === 'anticipationRate') {
          const nextInst = installment < 12 ? installment + 1 : 1;
          startEdit(brand, nextInst, 'mdrBase');
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'ArrowDown' && editingCell) {
      e.preventDefault();
      commitEdit();
      const next = editingCell.installment < 12 ? editingCell.installment + 1 : 1;
      startEdit(editingCell.brand, next, editingCell.field);
    } else if (e.key === 'ArrowUp' && editingCell) {
      e.preventDefault();
      commitEdit();
      const prev = editingCell.installment > 1 ? editingCell.installment - 1 : 12;
      startEdit(editingCell.brand, prev, editingCell.field);
    }
  }

  function applyBulk() {
    if (!bulkModal) return;
    const normalized = normalizeMdrInput(bulkValue);
    if (!normalized) return;
    onChange(applyBulkRate(matrix, bulkModal.brand, bulkModal.field, normalized));
    setBulkModal(null);
    setBulkValue('');
  }

  const severityColors = {
    error: 'bg-red-50 border-red-300 text-red-700',
    warning: 'bg-amber-50 border-amber-300 text-amber-700',
    ok: 'bg-white border-gray-200 text-gray-900',
    empty: 'bg-gray-50 border-gray-100 text-gray-400',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Brand tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {BRANDS.map((brand) => {
          const stats = validation.stats.find((s) => s.brand === brand);
          const hasErrors = validation.issues.some(
            (i) => i.brand === brand && i.type === 'error'
          );
          const hasWarnings = validation.issues.some(
            (i) => i.brand === brand && i.type === 'warning'
          );
          return (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                selectedBrand === brand
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {BRAND_LABELS[brand]}
              {stats?.isComplete && !hasErrors && !hasWarnings && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              )}
              {hasErrors && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              )}
              {!hasErrors && hasWarnings && (
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              )}
              {stats && (
                <span className="text-xs text-gray-400 font-normal">
                  {stats.filledCount}/12
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Brand summary bar */}
      {currentBrandStats && currentBrandStats.avgMdr && (
        <div className="flex items-center gap-6 px-1 text-sm text-gray-600">
          <span>
            Média:{' '}
            <strong className="text-gray-900">
              {parseFloat(currentBrandStats.avgMdr).toFixed(2)}%
            </strong>
          </span>
          <span>
            Mín:{' '}
            <strong className="text-gray-900">
              {parseFloat(currentBrandStats.minMdr).toFixed(2)}%
            </strong>
          </span>
          <span>
            Máx:{' '}
            <strong className="text-gray-900">
              {parseFloat(currentBrandStats.maxMdr).toFixed(2)}%
            </strong>
          </span>
          <span
            className={cn(
              'ml-auto px-2 py-0.5 rounded text-xs font-medium',
              currentBrandStats.isComplete
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            )}
          >
            {currentBrandStats.isComplete ? 'Completo' : `${currentBrandStats.filledCount}/12 preenchidos`}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">
                Parc.
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                MDR Base
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Antecipação
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-gray-100">
                MDR Final
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {INSTALLMENTS.map((inst, rowIdx) => {
              const entry = matrix[selectedBrand][inst as InstallmentNumber];
              const severity = entry.finalMdr
                ? getCellSeverity(issues, selectedBrand, inst)
                : 'empty';
              const cellIssues = issues.filter(
                (i) => i.brand === selectedBrand && i.installment === inst
              );

              return (
                <tr
                  key={inst}
                  className={cn(
                    'border-b border-gray-100 last:border-0 group',
                    rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  )}
                >
                  {/* Installment label */}
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-gray-700">{inst}x</span>
                  </td>

                  {/* MDR Base */}
                  <td className="px-2 py-1.5">
                    {editingCell?.brand === selectedBrand &&
                    editingCell?.installment === inst &&
                    editingCell?.field === 'mdrBase' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full text-center rounded border border-brand-400 bg-brand-50 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    ) : (
                      <button
                        onClick={() => !readOnly && startEdit(selectedBrand, inst, 'mdrBase')}
                        className={cn(
                          'w-full text-center rounded px-2 py-1 text-sm font-mono transition-colors',
                          'border hover:border-brand-300 hover:bg-brand-50',
                          entry.mdrBase ? 'text-gray-800 border-gray-200 bg-white' : 'text-gray-300 border-dashed border-gray-200 bg-gray-50/50',
                          readOnly && 'cursor-default hover:border-gray-200 hover:bg-white'
                        )}
                      >
                        {entry.mdrBase ? `${parseFloat(entry.mdrBase).toFixed(2)}%` : '—'}
                      </button>
                    )}
                  </td>

                  {/* Anticipation */}
                  <td className="px-2 py-1.5">
                    {editingCell?.brand === selectedBrand &&
                    editingCell?.installment === inst &&
                    editingCell?.field === 'anticipationRate' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full text-center rounded border border-brand-400 bg-brand-50 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    ) : (
                      <button
                        onClick={() => !readOnly && startEdit(selectedBrand, inst, 'anticipationRate')}
                        className={cn(
                          'w-full text-center rounded px-2 py-1 text-sm font-mono transition-colors',
                          'border hover:border-brand-300 hover:bg-brand-50',
                          entry.anticipationRate
                            ? 'text-gray-800 border-gray-200 bg-white'
                            : 'text-gray-300 border-dashed border-gray-200 bg-gray-50/50',
                          readOnly && 'cursor-default hover:border-gray-200 hover:bg-white'
                        )}
                      >
                        {entry.anticipationRate
                          ? `${parseFloat(entry.anticipationRate).toFixed(2)}%`
                          : '0,00%'}
                      </button>
                    )}
                  </td>

                  {/* Final MDR (computed) */}
                  <td className="px-2 py-1.5 bg-gray-50/80">
                    <div
                      className={cn(
                        'w-full text-center rounded px-2 py-1 text-sm font-mono font-semibold border',
                        severity === 'error' && 'bg-red-50 border-red-200 text-red-700',
                        severity === 'warning' && 'bg-amber-50 border-amber-200 text-amber-700',
                        severity === 'ok' && 'bg-emerald-50 border-emerald-200 text-emerald-700',
                        severity === 'empty' && 'bg-gray-100 border-gray-200 text-gray-400',
                        entry.isManualOverride && 'ring-1 ring-purple-400'
                      )}
                      title={
                        cellIssues.length > 0
                          ? cellIssues.map((i) => i.message).join('\n')
                          : undefined
                      }
                    >
                      {entry.finalMdr ? `${parseFloat(entry.finalMdr).toFixed(2)}%` : '—'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {entry.isManualOverride && (
                        <button
                          onClick={() => {
                            const updated = { ...matrix };
                            const e = { ...updated[selectedBrand][inst as InstallmentNumber] };
                            e.isManualOverride = false;
                            e.finalMdr = '';
                            updated[selectedBrand] = { ...updated[selectedBrand], [inst]: e };
                            onChange(updated);
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 px-1"
                          title="Remover override manual"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-200">
              <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Média</td>
              <td colSpan={2} />
              <td className="px-2 py-2.5 text-center">
                {currentBrandStats?.avgMdr ? (
                  <span className="text-sm font-bold text-gray-700 font-mono">
                    {parseFloat(currentBrandStats.avgMdr).toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bulk edit row */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Aplicar em massa para {BRAND_LABELS[selectedBrand]}:</span>
          <button
            onClick={() => setBulkModal({ brand: selectedBrand, field: 'mdrBase' })}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Definir MDR Base (todas parcelas)
          </button>
          <button
            onClick={() => setBulkModal({ brand: selectedBrand, field: 'anticipationRate' })}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Definir Antecipação (todas parcelas)
          </button>
        </div>
      )}

      {/* Issues for current brand */}
      {issues.filter((i) => i.brand === selectedBrand).length > 0 && (
        <div className="flex flex-col gap-1.5">
          {issues
            .filter((i) => i.brand === selectedBrand)
            .map((issue, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-start gap-2 text-sm px-3 py-2 rounded-lg',
                  issue.type === 'error' && 'bg-red-50 text-red-700',
                  issue.type === 'warning' && 'bg-amber-50 text-amber-700',
                  issue.type === 'info' && 'bg-blue-50 text-blue-700'
                )}
              >
                <span className="flex-shrink-0 mt-0.5">
                  {issue.type === 'error' ? '✕' : issue.type === 'warning' ? '⚠' : 'ℹ'}
                </span>
                {issue.message}
              </div>
            ))}
        </div>
      )}

      {/* Bulk edit modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Aplicar em massa — {BRAND_LABELS[bulkModal.brand]}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Define{' '}
              {bulkModal.field === 'mdrBase' ? 'MDR Base' : 'Taxa de Antecipação'} para todas as
              12 parcelas
            </p>
            <div className="flex items-center gap-2 mb-6">
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                placeholder="ex: 2.50"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyBulk();
                  if (e.key === 'Escape') setBulkModal(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBulkModal(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={applyBulk}
                className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
