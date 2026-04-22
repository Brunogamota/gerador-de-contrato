'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  FeesTable,
  PricingBrand,
  TableInstallment,
  OverrideMap,
  MarginHealth,
} from '@/lib/fees/pricingViewModel';
import {
  TABLE_INSTALLMENTS,
  PRICING_BRANDS,
  applyOverride,
  resetOverride,
  fmtRate,
} from '@/lib/fees/pricingViewModel';

const BRAND_META: Record<PricingBrand, { label: string; abbr: string; color: string; bg: string }> = {
  visa:       { label: 'Visa',             abbr: 'V',  color: '#1A56DB', bg: '#1A56DB22' },
  mastercard: { label: 'Mastercard',       abbr: 'M',  color: '#E3A008', bg: '#E3A00822' },
  elo:        { label: 'Elo',              abbr: 'E',  color: '#f72662', bg: '#f7266222' },
  amex:       { label: 'American Express', abbr: 'AX', color: '#059669', bg: '#05966922' },
  hipercard:  { label: 'Hipercard',        abbr: 'H',  color: '#F05252', bg: '#F0525222' },
  pix:        { label: 'Pix',             abbr: 'P',  color: '#6d28d9', bg: '#6d28d922' },
};

const HEALTH_COLORS: Record<MarginHealth, string> = {
  healthy: 'text-emerald-400',
  warning: 'text-amber-400',
  danger:  'text-red-400',
};

const INST_LABEL: Record<TableInstallment, string> = {
  1: 'À vista (1x)', 2: '2x', 3: '3x', 4: '4x', 6: '6x', 9: '9x', 12: '12x',
};

interface Props {
  table: FeesTable;
  overrides: OverrideMap;
  onOverrideChange: (overrides: OverrideMap) => void;
  showCosts: boolean;
}

export function FeesPricingTable({ table, overrides, onOverrideChange, showCosts }: Props) {
  const [editingCell, setEditingCell] = useState<{ brand: PricingBrand; inst: TableInstallment } | null>(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(brand: PricingBrand, inst: TableInstallment, currentRate: number) {
    setEditingCell({ brand, inst });
    setEditValue(currentRate.toFixed(2).replace('.', ','));
  }

  function commitEdit(brand: PricingBrand, inst: TableInstallment) {
    const raw = parseFloat(editValue.replace(',', '.'));
    if (!isNaN(raw) && raw > 0) {
      onOverrideChange(applyOverride(overrides, brand, inst, parseFloat(raw.toFixed(2))));
    }
    setEditingCell(null);
  }

  function handleReset(e: React.MouseEvent, brand: PricingBrand, inst: TableInstallment) {
    e.stopPropagation();
    onOverrideChange(resetOverride(overrides, brand, inst));
  }

  const isEditing = (brand: PricingBrand, inst: TableInstallment) =>
    editingCell?.brand === brand && editingCell?.inst === inst;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="px-5 py-3 text-left text-[10px] font-semibold tracking-widest uppercase text-white/35 w-44">
              Bandeira / Método
            </th>
            {TABLE_INSTALLMENTS.map((inst) => (
              <th key={inst} className="px-3 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-white/35 min-w-[90px]">
                {INST_LABEL[inst]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRICING_BRANDS.map((brand) => {
            const meta = BRAND_META[brand];
            return (
              <tr key={brand} className="border-b border-white/[0.04] group hover:bg-white/[0.015] transition-colors">
                {/* Brand label */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                      style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
                    >
                      {meta.abbr}
                    </div>
                    <span className="text-sm font-medium text-white/80">{meta.label}</span>
                  </div>
                </td>

                {/* Rate cells */}
                {TABLE_INSTALLMENTS.map((inst) => {
                  const cell = table[brand][inst];

                  if (!cell) {
                    return (
                      <td key={inst} className="px-3 py-3 text-right">
                        <span className="text-white/20 text-xs font-mono">—</span>
                      </td>
                    );
                  }

                  const editing = isEditing(brand, inst);

                  return (
                    <td
                      key={inst}
                      onClick={() => !editing && startEdit(brand, inst, cell.rate)}
                      className={cn(
                        'px-3 py-3 text-right cursor-pointer relative',
                        cell.hasOverride && !editing && 'bg-brand/[0.04]',
                      )}
                    >
                      {editing ? (
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(brand, inst)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')  commitEdit(brand, inst);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-20 text-right bg-white/10 border border-brand/60 rounded-lg px-2 py-1 text-sm font-mono text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5 group/cell">
                          <div className="flex items-center gap-1.5">
                            {cell.hasOverride && (
                              <button
                                onClick={(e) => handleReset(e, brand, inst)}
                                className="opacity-0 group-hover/cell:opacity-100 text-[9px] text-white/30 hover:text-white/60 transition-all"
                                title="Resetar override"
                              >
                                ↺
                              </button>
                            )}
                            <span className={cn(
                              'font-mono font-semibold text-sm transition-colors',
                              cell.hasOverride ? 'text-brand' : 'text-white/85',
                            )}>
                              {fmtRate(cell.rate)}
                            </span>
                          </div>
                          <span className={cn('font-mono text-[11px]', HEALTH_COLORS[cell.health])}>
                            {fmtRate(cell.margin)}
                          </span>
                          {showCosts && (
                            <span className="font-mono text-[10px] text-white/25">
                              custo: {fmtRate(cell.cost)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
