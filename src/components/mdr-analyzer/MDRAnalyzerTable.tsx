'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { StrategyProfile, EnrichedRow, BrandKey } from '@/lib/mdr-analyzer/types';
import {
  STRATEGY_CONFIG,
  BRAND_COLORS,
  BRAND_LABELS_MAP,
  ALL_BRANDS,
  getClassificationConfig,
  getIntelligentClassConfig,
  getSpreadCellClass,
  fmtPct,
  fmtCurrency,
} from '@/lib/mdr-analyzer/calculations';

interface MDRAnalyzerTableProps {
  enrichedRows: EnrichedRow[];
  strategy: StrategyProfile;
  activeBrand: BrandKey | 'all';
  onBrandChange: (b: BrandKey | 'all') => void;
  onAutoAdjust: (installmentIdx: number, newSpread: number) => void;
}

export function MDRAnalyzerTable({
  enrichedRows,
  strategy,
  activeBrand,
  onBrandChange,
  onAutoAdjust,
}: MDRAnalyzerTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingRow, setEditingRow]   = useState<number | null>(null);
  const [editValue, setEditValue]     = useState('');
  const [customizeMode, setCustomizeMode] = useState(false);

  const avgCost   = enrichedRows.reduce((a, b) => a + b.cost,      0) / enrichedRows.length;
  const avgSpread = enrichedRows.reduce((a, b) => a + b.spread,    0) / enrichedRows.length;
  const avgFinal  = enrichedRows.reduce((a, b) => a + b.finalRate, 0) / enrichedRows.length;
  const stratCfg  = STRATEGY_CONFIG[strategy];

  function toggleExpand(inst: number) {
    if (editingRow !== null) return;
    setExpandedRow((prev) => (prev === inst ? null : inst));
  }

  function startEdit(e: React.MouseEvent, inst: number, spread: number) {
    e.stopPropagation();
    setExpandedRow(null);
    setEditingRow(inst);
    setEditValue(spread.toFixed(2).replace('.', ','));
  }

  function saveEdit(installmentIdx: number) {
    const raw = editValue.replace(',', '.');
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      onAutoAdjust(installmentIdx, parseFloat(val.toFixed(2)));
    }
    setEditingRow(null);
  }

  function cancelEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingRow(null);
  }

  return (
    <div className="bg-[#18181B] rounded-2xl border border-white/[0.06]">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white">Estrutura de Pricing</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Edite diretamente os valores ou ajuste a estratégia para recalcular.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span>Estratégia aplicada:</span>
            <span className="font-semibold" style={{ color: stratCfg.color }}>{stratCfg.label}</span>
          </div>
          <button
            onClick={() => setCustomizeMode((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              customizeMode
                ? 'bg-white/[0.08] text-white border-white/20'
                : 'border-white/[0.09] text-white/60 hover:text-white hover:border-white/20',
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {customizeMode ? 'Concluir' : 'Personalizar'}
          </button>
        </div>
      </div>

      {/* Customize-mode banner */}
      {customizeMode && (
        <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl flex items-center gap-2 border border-brand/25 bg-brand/[0.05]">
          <svg className="w-3.5 h-3.5 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-xs text-white/55">
            Modo de personalização ativo — clique no ícone de edição para ajustar o spread de qualquer parcela.
          </span>
        </div>
      )}

      {/* Brand filter tabs */}
      <div className="flex items-center gap-0.5 px-6 pb-4 overflow-x-auto">
        <BrandTab label="Todas" active={activeBrand === 'all'} onClick={() => onBrandChange('all')} />
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
              <th className="px-6 py-3 text-left text-[10px] font-semibold tracking-widest uppercase text-white/35 w-40">
                Parcelas
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-white/35">
                <div>Custo (%)</div>
                <div className="font-normal normal-case tracking-normal text-white/25">Adquirente</div>
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold tracking-widest uppercase text-white/35">
                <div>Spread (%)</div>
                <div className="font-normal normal-case tracking-normal text-white/25">Margem aplicada</div>
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold tracking-widest uppercase text-white/35">
                <div>Taxa final (%)</div>
                <div className="font-normal normal-case tracking-normal text-white/25">Cobrado do cliente</div>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest uppercase text-white/35">
                Classificação
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold tracking-widest uppercase text-white/35 w-16">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {enrichedRows.map((row) => {
              const classCfg      = getClassificationConfig(row.classification);
              const spreadCls     = getSpreadCellClass(row.classification);
              const isExpanded    = expandedRow === row.installment;
              const isEditingThis = editingRow === row.installment;

              return (
                <>
                  <tr
                    key={row.installment}
                    onClick={() => toggleExpand(row.installment)}
                    className={cn(
                      'group border-b border-white/[0.04] cursor-pointer transition-colors',
                      isExpanded && !isEditingThis ? 'bg-white/[0.04]' : 'hover:bg-white/[0.025]',
                      isEditingThis && 'cursor-default',
                    )}
                  >
                    {/* Parcelas — revenue detail fades in on hover */}
                    <td className="px-6 py-0">
                      <div className="py-2.5">
                        <p className="font-medium text-white/90 leading-none">{row.label}</p>
                        <p className="text-[10px] font-mono text-transparent group-hover:text-emerald-400/70 transition-colors mt-1 leading-none">
                          {fmtCurrency(row.detail.revenueMonthly)}/mês · {fmtCurrency(row.detail.revenuePerTx)}/tx
                        </p>
                      </div>
                    </td>

                    {/* Custo */}
                    <td className="px-4 py-3 text-right font-mono text-white/60">
                      {fmtPct(row.cost)}
                    </td>

                    {/* Spread — full-cell heatmap background */}
                    <td
                      className={cn(
                        'px-4 py-3 text-center font-mono font-semibold transition-colors',
                        !isEditingThis ? spreadCls : 'text-white',
                      )}
                      onClick={(e) => isEditingThis && e.stopPropagation()}
                    >
                      {isEditingThis ? (
                        <div className="flex items-center justify-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')  saveEdit(row.installment - 1);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={() => saveEdit(row.installment - 1)}
                            autoFocus
                            className="w-20 bg-white/10 border border-brand/60 rounded-lg px-2 py-1 text-sm font-mono text-center text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                          />
                        </div>
                      ) : (
                        fmtPct(row.spread)
                      )}
                    </td>

                    {/* Taxa final */}
                    <td className="px-4 py-3 text-center font-mono font-semibold text-white">
                      {fmtPct(row.finalRate)}
                    </td>

                    {/* Classification — SpreadClassification labels */}
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-semibold', classCfg.textColor)}>
                        {classCfg.label}
                      </span>
                    </td>

                    {/* Action — pencil / save+cancel */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {isEditingThis ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(row.installment - 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => cancelEdit(e)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => startEdit(e, row.installment, row.spread)}
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-all mx-auto',
                            customizeMode
                              ? 'text-brand/70 bg-brand/10 hover:text-brand'
                              : 'text-white/25 hover:text-white/60 hover:bg-white/[0.06]',
                          )}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expand detail panel */}
                  {isExpanded && !isEditingThis && (
                    <tr key={`${row.installment}-detail`} className="border-b border-white/[0.06]">
                      <td colSpan={6} className="px-0 py-0">
                        <RowDetailPanel
                          row={row}
                          onAutoAdjust={(newSpread) => {
                            onAutoAdjust(row.installment - 1, newSpread);
                            setExpandedRow(null);
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>

          {/* Summary footer */}
          <tfoot>
            <tr className="bg-white/[0.03] border-t border-white/[0.08]">
              <td className="px-6 py-3 text-[10px] font-semibold tracking-widest uppercase text-white/40">Média</td>
              <td className="px-4 py-3 text-right font-mono text-sm text-white/50">{fmtPct(avgCost)}</td>
              <td className="px-4 py-3 text-center font-mono text-sm font-semibold text-white/70">{fmtPct(avgSpread)}</td>
              <td className="px-4 py-3 text-center font-mono text-sm font-semibold text-white">{fmtPct(avgFinal)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Row detail expand panel ─────────────────────────────────────────────────

function RowDetailPanel({
  row,
  onAutoAdjust,
}: {
  row: EnrichedRow;
  onAutoAdjust: (newSpread: number) => void;
}) {
  const { detail } = row;
  const intlCfg = getIntelligentClassConfig(row.intelligentClass);
  const benchmarkPositive = detail.benchmark.delta > 0.08;
  const benchmarkNegative = detail.benchmark.delta < -0.08;

  return (
    <div className="px-6 py-4 bg-white/[0.02]">
      <div className="grid grid-cols-3 gap-5 mb-4">
        {/* Revenue */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">Receita estimada</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Mensal</span>
              <span className="text-xs font-mono font-semibold text-emerald-400">{fmtCurrency(detail.revenueMonthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Por transação</span>
              <span className="text-xs font-mono text-white/70">{fmtCurrency(detail.revenuePerTx)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">% do volume</span>
              <span className="text-xs font-mono text-white/50">{detail.volumeSharePct}%</span>
            </div>
          </div>
        </div>

        {/* Benchmark */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">Benchmark de mercado</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Referência</span>
              <span className="text-xs font-mono text-white/60">{fmtPct(detail.benchmark.marketNorm)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Atual</span>
              <span className="text-xs font-mono text-white/70">{fmtPct(row.spread)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Posição</span>
              <span className={cn(
                'text-xs font-semibold',
                benchmarkPositive ? 'text-amber-400' : benchmarkNegative ? 'text-emerald-400' : 'text-white/50',
              )}>
                {detail.benchmark.label}
              </span>
            </div>
          </div>
        </div>

        {/* Intelligent classification */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">Análise da faixa</p>
          <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg self-start', intlCfg.bgColor)}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: intlCfg.dotColor }} />
            <span className={cn('text-xs font-semibold', intlCfg.textColor)}>{intlCfg.label}</span>
          </div>
          {detail.suggestion && (
            <p className="text-[11px] text-white/40 leading-snug mt-1">{detail.suggestion}</p>
          )}
        </div>
      </div>

      {/* Auto-adjust CTA */}
      {detail.suggestedSpread !== null && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-white/50">
              Spread sugerido:{' '}
              <span className="font-semibold text-white">{fmtPct(detail.suggestedSpread)}</span>
              {' '}— mantém competitividade e melhora margem
            </span>
          </div>
          <button
            onClick={() => detail.suggestedSpread !== null && onAutoAdjust(detail.suggestedSpread)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shrink-0"
            style={{ background: 'linear-gradient(135deg,#f72662,#771339)', boxShadow: '0 0 10px rgba(247,38,98,0.25)' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Ajustar automaticamente
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Brand tab ───────────────────────────────────────────────────────────────

function BrandTab({
  label, dot, active, onClick,
}: {
  label: string; dot?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
        active ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04]',
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />}
      {label}
    </button>
  );
}
