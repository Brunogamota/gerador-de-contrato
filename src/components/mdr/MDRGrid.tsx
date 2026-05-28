'use client';

import { useRef, useState, KeyboardEvent, useEffect } from 'react';
import {
  BrandName,
  BRANDS,
  BRAND_LABELS,
  INSTALLMENTS,
  InstallmentNumber,
  MDRMatrix,
  ValidationIssue,
} from '@/types/pricing';
import { INSTALLMENT_LABELS } from '@/components/contract/document/formatters';
import {
  updateMatrixEntry,
  applyBulkRate,
  normalizeMdrInput,
} from '@/lib/calculations/mdr';
import { getCellSeverity, validateMatrix } from '@/lib/calculations/validation';
import { cn } from '@/lib/utils';

// ── Banded mode ────────────────────────────────────────────────
const BANDS = [
  { label: '1x (À vista)',  insts: [1] },
  { label: '2x – 6x',       insts: [2, 3, 4, 5, 6] },
  { label: '7x – 12x',      insts: [7, 8, 9, 10, 11, 12] },
] as const;

type BandIdx = 0 | 1 | 2;
type MdrMode = 'detailed' | 'banded';

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
  const [editingCell, setEditingCell] = useState<CellId | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bulkModal, setBulkModal] = useState<{ brand: BrandName; field: 'mdrBase' | 'anticipationRate' } | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [mdrMode, setMdrMode] = useState<MdrMode>('detailed');
  const inputRef = useRef<HTMLInputElement>(null);

  const validation = validateMatrix(matrix);
  const currentBrandStats = validation.stats.find((s) => s.brand === selectedBrand);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // ── Detailed mode helpers ──────────────────────────────────
  function getCellValue(brand: BrandName, installment: number, field: CellId['field']): string {
    return matrix[brand][installment as InstallmentNumber][field] ?? '';
  }

  function startEdit(brand: BrandName, installment: number, field: CellId['field']) {
    if (readOnly || field === 'finalMdr') return;
    setEditingCell({ brand, installment, field });
    setEditValue(getCellValue(brand, installment, field));
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
      if (mdrMode === 'banded') { commitBandedEdit(); return; }
      commitEdit();
      if (editingCell) {
        const { brand, installment, field } = editingCell;
        if (field === 'mdrBase') startEdit(brand, installment, 'anticipationRate');
        else if (field === 'anticipationRate') startEdit(brand, installment < 12 ? installment + 1 : 1, 'mdrBase');
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null); setEditValue('');
    } else if (e.key === 'ArrowDown' && editingCell && mdrMode === 'detailed') {
      e.preventDefault(); commitEdit();
      startEdit(editingCell.brand, editingCell.installment < 12 ? editingCell.installment + 1 : 1, editingCell.field);
    } else if (e.key === 'ArrowUp' && editingCell && mdrMode === 'detailed') {
      e.preventDefault(); commitEdit();
      startEdit(editingCell.brand, editingCell.installment > 1 ? editingCell.installment - 1 : 12, editingCell.field);
    }
  }

  // ── Banded mode helpers ────────────────────────────────────
  function getBandValue(brand: BrandName, bandIdx: BandIdx, field: 'mdrBase' | 'anticipationRate' | 'finalMdr'): { value: string; isMixed: boolean } {
    const insts = BANDS[bandIdx].insts;
    const vals = insts.map((i) => matrix[brand][i as InstallmentNumber][field] ?? '');
    const nonEmpty = vals.filter(Boolean);
    if (!nonEmpty.length) return { value: '', isMixed: false };
    const rounded = nonEmpty.map((v) => parseFloat(v).toFixed(4));
    const unique = [...new Set(rounded)];
    return { value: nonEmpty[0], isMixed: unique.length > 1 };
  }

  function startBandEdit(bandIdx: BandIdx, field: 'mdrBase' | 'anticipationRate') {
    if (readOnly) return;
    const { value } = getBandValue(selectedBrand, bandIdx, field);
    setEditingCell({ brand: selectedBrand, installment: bandIdx, field });
    setEditValue(value);
  }

  function commitBandedEdit() {
    if (!editingCell) return;
    const { brand, installment: bandIdx, field } = editingCell;
    if (field === 'finalMdr') { setEditingCell(null); return; }
    const insts = BANDS[bandIdx as BandIdx]?.insts ?? [];
    const normalized = editValue === '' ? '' : normalizeMdrInput(editValue) || editValue;
    let next = matrix;
    for (const i of insts) {
      next = updateMatrixEntry(next, brand, i as InstallmentNumber, field as 'mdrBase' | 'anticipationRate', normalized);
    }
    onChange(next);
    setEditingCell(null);
    setEditValue('');
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
      {/* Mode toggle */}
      {!readOnly && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 w-fit">
            {([
              { id: 'detailed', label: 'Detalhado (1x–12x)' },
              { id: 'banded',   label: 'Simplificado (3 bandas)' },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => { setMdrMode(m.id); setEditingCell(null); }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  mdrMode === m.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mdrMode === 'banded' && (
            <p className="text-xs text-gray-400">O valor de cada banda é replicado para todas as parcelas do grupo.</p>
          )}
        </div>
      )}

      {/* Brand tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {BRANDS.map((brand) => {
          const stats = validation.stats.find((s) => s.brand === brand);
          const hasErrors = validation.issues.some((i) => i.brand === brand && i.type === 'error');
          const hasWarnings = validation.issues.some((i) => i.brand === brand && i.type === 'warning');
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
              {hasErrors && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
              {!hasErrors && hasWarnings && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
              {stats && (
                <span className="text-xs text-gray-400 font-normal">{stats.filledCount}/12</span>
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

      {/* ── BANDED TABLE ─────────────────────────────────────── */}
      {mdrMode === 'banded' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.08em] w-36">Banda</th>
                <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Transação (%)</th>
                <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Antecipação (%)</th>
                <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-[0.08em] bg-gray-100/80 border-l border-gray-200">Taxa Final (%)</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((band, bandIdx) => {
                const bi = bandIdx as BandIdx;
                const base  = getBandValue(selectedBrand, bi, 'mdrBase');
                const ant   = getBandValue(selectedBrand, bi, 'anticipationRate');
                const final = getBandValue(selectedBrand, bi, 'finalMdr');

                const isEditingBase = editingCell?.installment === bi && editingCell?.field === 'mdrBase';
                const isEditingAnt  = editingCell?.installment === bi && editingCell?.field === 'anticipationRate';

                return (
                  <tr key={band.label} className={cn('border-b border-gray-100 last:border-0 group transition-colors', bandIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/70' : 'bg-gray-50/40 hover:bg-slate-50/70')}>
                    <td className="px-4 py-3">
                      <span className="text-gray-800 text-[13px] font-semibold">{band.label}</span>
                      <span className="ml-2 text-[10px] text-gray-400">({band.insts.length} parcela{band.insts.length > 1 ? 's' : ''})</span>
                    </td>

                    {/* MDR Base */}
                    <td className="px-2 py-2">
                      {isEditingBase ? (
                        <input ref={inputRef} type="text" inputMode="decimal" value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitBandedEdit} onKeyDown={handleKeyDown}
                          className="w-full text-center rounded border-2 border-brand-500 bg-white text-gray-900 px-2 py-1.5 text-sm font-mono focus:outline-none"
                        />
                      ) : (
                        <button onClick={() => !readOnly && startBandEdit(bi, 'mdrBase')}
                          className={cn('w-full text-center rounded px-2 py-1.5 text-sm font-mono transition-colors border hover:border-brand-400 hover:bg-white',
                            base.value ? 'text-gray-800 border-gray-200 bg-white' : 'text-gray-300 border-dashed border-gray-200 bg-gray-50/50',
                            readOnly && 'cursor-default hover:border-gray-200 hover:bg-white')}
                        >
                          {base.value ? `${parseFloat(base.value).toFixed(2)}%` : '—'}
                          {base.isMixed && <span className="ml-1 text-[10px] text-amber-500">Misto</span>}
                        </button>
                      )}
                    </td>

                    {/* Anticipation */}
                    <td className="px-2 py-2">
                      {isEditingAnt ? (
                        <input ref={inputRef} type="text" inputMode="decimal" value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitBandedEdit} onKeyDown={handleKeyDown}
                          className="w-full text-center rounded border-2 border-brand-500 bg-white text-gray-900 px-2 py-1.5 text-sm font-mono focus:outline-none"
                        />
                      ) : (
                        <button onClick={() => !readOnly && startBandEdit(bi, 'anticipationRate')}
                          className={cn('w-full text-center rounded px-2 py-1.5 text-sm font-mono transition-colors border hover:border-brand-400 hover:bg-white',
                            ant.value ? 'text-gray-800 border-gray-200 bg-white' : 'text-gray-300 border-dashed border-gray-200 bg-gray-50/50',
                            readOnly && 'cursor-default hover:border-gray-200 hover:bg-white')}
                        >
                          {ant.value ? `${parseFloat(ant.value).toFixed(2)}%` : '0,00%'}
                          {ant.isMixed && <span className="ml-1 text-[10px] text-amber-500">Misto</span>}
                        </button>
                      )}
                    </td>

                    {/* Final MDR */}
                    <td className="px-2 py-2 bg-gray-50/60 border-l border-gray-100">
                      <div className={cn('w-full text-center rounded px-2 py-1.5 text-sm font-mono font-semibold border',
                        final.value ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-400')}>
                        {final.value ? `${parseFloat(final.value).toFixed(2)}%` : '—'}
                        {final.isMixed && <span className="ml-1 text-[10px] text-amber-500">Misto</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DETAILED TABLE ────────────────────────────────────── */}
      {mdrMode === 'detailed' && (
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-[0.08em]">
                Modo
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
                Transação (%)
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
                Antecipação (%)
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-[0.08em] bg-gray-100/80 border-l border-gray-200">
                Taxa Final (%)
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] w-28">
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
                    'border-b border-gray-100 last:border-0 group transition-colors',
                    rowIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/70' : 'bg-gray-50/40 hover:bg-slate-50/70'
                  )}
                >
                  {/* Installment label */}
                  <td className="px-4 py-3">
                    <span className="text-gray-800 text-[13px] font-medium">{INSTALLMENT_LABELS[inst as number]}</span>
                  </td>

                  {/* MDR Base */}
                  <td className="px-2 py-2">
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
                        className="w-full text-center rounded border-2 border-brand-500 bg-white text-gray-900 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 placeholder:text-gray-400"
                      />
                    ) : (
                      <button
                        onClick={() => !readOnly && startEdit(selectedBrand, inst, 'mdrBase')}
                        className={cn(
                          'w-full text-center rounded px-2 py-1.5 text-sm font-mono transition-colors',
                          'border hover:border-brand-400 hover:bg-white',
                          entry.mdrBase ? 'text-gray-800 border-gray-200 bg-white' : 'text-gray-300 border-dashed border-gray-200 bg-gray-50/50',
                          readOnly && 'cursor-default hover:border-gray-200 hover:bg-white'
                        )}
                      >
                        {entry.mdrBase ? `${parseFloat(entry.mdrBase).toFixed(2)}%` : '—'}
                      </button>
                    )}
                  </td>

                  {/* Anticipation */}
                  <td className="px-2 py-2">
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
                        className="w-full text-center rounded border-2 border-brand-500 bg-white text-gray-900 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 placeholder:text-gray-400"
                      />
                    ) : (
                      <button
                        onClick={() => !readOnly && startEdit(selectedBrand, inst, 'anticipationRate')}
                        className={cn(
                          'w-full text-center rounded px-2 py-1.5 text-sm font-mono transition-colors',
                          'border hover:border-brand-400 hover:bg-white',
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
                  <td className="px-2 py-2 bg-gray-50/60 border-l border-gray-100">
                    <div
                      className={cn(
                        'w-full text-center rounded px-2 py-1.5 text-sm font-mono font-semibold border',
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
                  <td className="px-2 py-2">
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
              <td className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.08em]">Média</td>
              <td colSpan={2} />
              <td className="px-2 py-3 text-center border-l border-gray-200">
                {currentBrandStats?.avgMdr ? (
                  <span className="text-sm font-bold text-gray-800 font-mono">
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
      )} {/* end mdrMode === 'detailed' */}

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
