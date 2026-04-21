'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { StrategyProfile, AnalyzerRow, BrandKey } from '@/lib/mdr-analyzer/types';
import {
  STRATEGY_CONFIG,
  BRAND_COLORS,
  BRAND_LABELS_MAP,
  ALL_BRANDS,
  getClassificationConfig,
  getSpreadCellClass,
  fmtPct,
} from '@/lib/mdr-analyzer/calculations';

interface MDRAnalyzerTableProps {
  rows: AnalyzerRow[];
  strategy: StrategyProfile;
  activeBrand: BrandKey | 'all';
  onBrandChange: (b: BrandKey | 'all') => void;
}

export function MDRAnalyzerTable({
  rows,
  strategy,
  activeBrand,
  onBrandChange,
}: MDRAnalyzerTableProps) {
  const [editingRow, setEditingRow] = useState<number | null>(null);

  const avgCost  = rows.reduce((a, b) => a + b.cost,      0) / rows.length;
  const avgSpread = rows.reduce((a, b) => a + b.spread,   0) / rows.length;
  const avgFinal  = rows.reduce((a, b) => a + b.finalRate, 0) / rows.length;

  const stratCfg = STRATEGY_CONFIG[strategy];

  return (
    <div className="bg-[#18181B] rounded-2xl border border-white/[0.06]">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white">Estrutura de Pricing</h2>
          <p className="text-xs text-white/40 mt-0.5">Edite diretamente os valores ou ajuste a estratégia para recalcular.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span>Estratégia aplicada:</span>
            <span className="font-semibold" style={{ color: stratCfg.color }}>{stratCfg.label}</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.09] text-white/60 hover:text-white hover:border-white/20 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Personalizar
          </button>
        </div>
      </div>

      {/* Brand filter tabs */}
      <div className="flex items-center gap-0.5 px-6 pb-4 overflow-x-auto">
        <BrandTab
          label="Todas"
          active={activeBrand === 'all'}
          onClick={() => onBrandChange('all')}
        />
        {ALL_BRANDS.map((b) => (
          <BrandTab
            key={b}
            label={BRAND_LABELS_MAP[b]}
            dot={BRAND_COLORS[b]}
            active={activeBrand === b}
            onClick={() => onBrandChange(b)}
          />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-6 py-3 text-left text-[10px] font-semibold tracking-widest uppercase text-white/35 w-32">
                Parcelas
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-white/35">
                <div>Custo (%)</div>
                <div className="font-normal normal-case tracking-normal text-white/25">Adquirente</div>
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-white/35">
                <div>Spread (%)</div>
                <div className="font-normal normal-case tracking-normal text-white/25">Margem aplicada</div>
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-white/35">
                <div>Taxa final (%)</div>
                <div className="font-normal normal-case tracking-normal text-white/25">Cobrado do cliente</div>
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold tracking-widest uppercase text-white/35">
                Classificação
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold tracking-widest uppercase text-white/35 w-16">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const classConf = getClassificationConfig(row.classification);
              const spreadClass = getSpreadCellClass(row.classification);
              return (
                <tr
                  key={row.installment}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3 font-medium text-white/90">{row.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-white/60">{fmtPct(row.cost)}</td>
                  <td className="px-0 py-0">
                    <div className={cn('px-4 py-3 text-right font-mono font-semibold', spreadClass)}>
                      {fmtPct(row.spread)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                    {fmtPct(row.finalRate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-xs font-semibold', classConf.textColor)}>
                      {classConf.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setEditingRow(editingRow === row.installment ? null : row.installment)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Summary row */}
          <tfoot>
            <tr className="bg-white/[0.03] border-t border-white/[0.08]">
              <td className="px-6 py-3 text-[10px] font-semibold tracking-widest uppercase text-white/40">
                Média
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-white/50">
                {fmtPct(avgCost)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-white/70">
                {fmtPct(avgSpread)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-white">
                {fmtPct(avgFinal)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function BrandTab({
  label,
  dot,
  active,
  onClick,
}: {
  label: string;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04]',
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
      )}
      {label}
    </button>
  );
}
