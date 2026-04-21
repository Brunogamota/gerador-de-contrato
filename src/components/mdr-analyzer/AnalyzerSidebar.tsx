'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { StrategyProfile, EnrichedRow } from '@/lib/mdr-analyzer/types';
import {
  STRATEGY_CONFIG,
  SAMPLE_CLIENT,
  SAMPLE_HISTORY,
  fmtCurrency,
  fmtPct,
} from '@/lib/mdr-analyzer/calculations';

const STRATEGY_ORDER: StrategyProfile[] = ['conservative', 'balanced', 'aggressive', 'max_margin'];
const STRATEGY_SIDEBAR_LABELS = ['Conservador', 'Balanceado', 'Agressivo', 'Máxima\nmargem'];
const RISK_COLORS: Record<string, string> = {
  baixo:    'text-emerald-400',
  moderado: 'text-amber-400',
  alto:     'text-red-400',
};

interface AnalyzerSidebarProps {
  strategy: StrategyProfile;
  enrichedRows: EnrichedRow[];
  onStrategyChange: (s: StrategyProfile) => void;
  onRecalculate: () => void;
  onApplyOptimization: () => void;
}

export function AnalyzerSidebar({
  strategy,
  enrichedRows,
  onStrategyChange,
  onRecalculate,
  onApplyOptimization,
}: AnalyzerSidebarProps) {
  const router = useRouter();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const client = SAMPLE_CLIENT;
  const selectedIdx = STRATEGY_ORDER.indexOf(strategy);

  const row12  = enrichedRows[11];
  const row1   = enrichedRows[0];
  const totalRev = enrichedRows.reduce((s, r) => s + r.detail.revenueMonthly, 0);
  const subpricedCount = enrichedRows.filter((r) => r.intelligentClass === 'subprecificado').length;

  const quickInsights = [
    { text: `12x gera ${fmtCurrency(row12?.detail.revenueMonthly ?? 0)}/mês sozinho` },
    { text: `À vista competitivo: taxa final ${fmtPct(row1?.finalRate ?? 0)}` },
    subpricedCount > 0
      ? { text: `${subpricedCount} faixa${subpricedCount > 1 ? 's' : ''} subprecificada${subpricedCount > 1 ? 's' : ''} — gain potencial` }
      : { text: 'Todas as faixas dentro do padrão de mercado' },
    { text: `Receita estimada: ${fmtCurrency(totalRev)}/mês` },
  ];

  return (
    <aside className="w-[300px] shrink-0 flex flex-col border-l border-white/[0.06] bg-[#0f0f10] overflow-y-auto">
      {/* ── Cliente ── */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-white/35">Cliente</span>
          <button onClick={() => router.push('/proposals/new')} className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors">Editar</button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white leading-snug pr-3">{client.name}</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 whitespace-nowrap">
            Ativo
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <SidebarField label="CNPJ"        value={client.cnpj} />
          <SidebarField label="MCC"         value={client.mcc} />
          <SidebarField label="Segmento"    value={client.segment} />
          <SidebarField
            label="Risco"
            value={client.risk.charAt(0).toUpperCase() + client.risk.slice(1)}
            valueClass={RISK_COLORS[client.risk]}
          />
          <SidebarField label="Início de operação" value={client.startDate} />
        </div>
      </div>

      {/* ── Estratégia de precificação ── */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-1">Estratégia de precificação</p>
        <p className="text-xs text-white/40 mb-5">Ajuste o nível de agressividade da proposta.</p>

        <StrategySlider
          selectedIdx={selectedIdx}
          onChange={(idx) => onStrategyChange(STRATEGY_ORDER[idx])}
        />

        <button
          onClick={onRecalculate}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.09] text-sm font-medium text-white/60 hover:text-white hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Recalcular
        </button>
      </div>

      {/* ── Insights rápidos ── */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-3">Insights rápidos</p>
        <div className="flex flex-col gap-2">
          {quickInsights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="mt-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-2 h-2 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs text-white/60 leading-snug">{ins.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Histórico de execuções ── */}
      <div className="px-5 py-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/35">Histórico de execuções</p>
          <button onClick={() => setShowAllHistory((v) => !v)} className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors">
            {showAllHistory ? 'Ocultar' : 'Ver todas'}
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {(showAllHistory ? SAMPLE_HISTORY : SAMPLE_HISTORY.slice(0, 3)).map((run) => (
            <div key={run.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: run.dotColor }} />
                <span className="text-xs text-white/45">{run.date} {run.time}</span>
              </div>
              <span className="text-xs font-medium text-white/70">{run.strategyLabel}</span>
              <span className="text-xs text-white/35">{run.user}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="px-5 pb-6 pt-3">
        <button
          onClick={onApplyOptimization}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#f72662,#771339)', boxShadow: '0 0 20px rgba(247,38,98,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Aplicar estratégia otimizada
        </button>
      </div>
    </aside>
  );
}

function SidebarField({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-white/35 shrink-0">{label}</span>
      <span className={cn('text-xs font-mono text-right truncate', valueClass ?? 'text-white/65')}>
        {value}
      </span>
    </div>
  );
}

function StrategySlider({
  selectedIdx,
  onChange,
}: {
  selectedIdx: number;
  onChange: (idx: number) => void;
}) {
  const pct = (selectedIdx / (STRATEGY_ORDER.length - 1)) * 100;

  return (
    <div className="px-1">
      {/* Track + stops */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute left-3 right-3 top-[5px] h-px bg-white/10" />
        {/* Filled track */}
        <div
          className="absolute left-3 top-[5px] h-px bg-brand transition-all duration-300"
          style={{ width: `calc(${pct}% * (100% - 24px) / 100)` }}
        />

        {/* Stops */}
        <div className="relative flex justify-between">
          {STRATEGY_ORDER.map((opt, idx) => {
            const isSelected = idx === selectedIdx;
            const isPast = idx < selectedIdx;
            const cfg = STRATEGY_CONFIG[opt];
            return (
              <button
                key={opt}
                onClick={() => onChange(idx)}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className={cn(
                    'w-[11px] h-[11px] rounded-full border-2 transition-all duration-200',
                    isSelected
                      ? 'scale-125 shadow-[0_0_8px_2px_rgba(247,38,98,0.5)]'
                      : isPast
                      ? 'border-brand/40 bg-brand/20'
                      : 'border-white/20 bg-[#0f0f10] group-hover:border-white/40',
                  )}
                  style={isSelected ? { backgroundColor: cfg.color, borderColor: cfg.color } : undefined}
                />
                <span
                  className="text-[10px] leading-tight text-center whitespace-pre-line transition-colors"
                  style={{ color: isSelected ? cfg.color : 'rgba(255,255,255,0.35)' }}
                >
                  {STRATEGY_SIDEBAR_LABELS[idx]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
