'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { StrategyProfile, BrandKey, OptimizationResult } from '@/lib/mdr-analyzer/types';
import {
  STRATEGY_CONFIG,
  SAMPLE_COST_DATA,
  SAMPLE_CLIENT,
  getAllBrandsAverage,
  computeRows,
  computeMetrics,
  computeInsights,
  enrichRows,
  computeSmartSuggestions,
  computeOptimization,
  applyCustomSpread,
  fmtPct,
  fmtCurrency,
} from '@/lib/mdr-analyzer/calculations';
import { MDRAnalyzerTable } from '@/components/mdr-analyzer/MDRAnalyzerTable';
import { AnalyzerSidebar } from '@/components/mdr-analyzer/AnalyzerSidebar';
import { SmartSuggestionsBlock } from '@/components/mdr-analyzer/SmartSuggestionsBlock';

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ trend }: { trend: 'up' | 'neutral' }) {
  const upD   = 'M0 18 C8 17,14 14,22 12 S36 8,44 6 S58 4,68 3';
  const flatD = 'M0 12 C10 11,20 13,30 12 S50 11,68 12';
  return (
    <svg width="68" height="22" viewBox="0 0 68 22" fill="none" className="opacity-80">
      <path d={trend === 'up' ? upD : flatD} stroke="#f72662" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── DonutChart ────────────────────────────────────────────────────────────────
function DonutChart({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" className="shrink-0">
      <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4.5" />
      <circle cx="27" cy="27" r={r} fill="none" stroke="#f72662" strokeWidth="4.5"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 27 27)" className="transition-all duration-500" />
    </svg>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────
interface MetricCardProps { label: string; value: string; prefix?: string; sub: string; subPositive?: boolean; chart?: React.ReactNode; }
function MetricCard({ label, value, prefix, sub, subPositive, chart }: MetricCardProps) {
  return (
    <div className="bg-[#111113] rounded-xl border border-white/[0.06] p-4 flex flex-col gap-2 min-w-0">
      <p className="text-xs text-white/40 truncate">{label}</p>
      <div className="flex items-baseline gap-1 leading-none">
        {prefix && <span className="text-sm font-semibold text-white/60">{prefix}</span>}
        <span className="text-2xl font-bold text-white tracking-tight whitespace-nowrap">{value}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className={cn('text-xs leading-snug', subPositive ? 'text-emerald-400' : 'text-white/40')}>{sub}</p>
        {chart && <div className="shrink-0">{chart}</div>}
      </div>
    </div>
  );
}

// ─── OperationProfileCard ──────────────────────────────────────────────────────
function OperationProfileCard() {
  const client = SAMPLE_CLIENT;
  const { transactionMix: mix } = client;
  return (
    <div className="bg-[#111113] rounded-xl border border-white/[0.06] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Perfil do cliente</p>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
          {client.profileLabel}
        </span>
      </div>
      <div>
        <p className="text-[10px] text-white/35 mb-2 uppercase tracking-widest font-semibold">Mix de transações</p>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          <div className="rounded-l-full bg-blue-500" style={{ width: `${mix.vista}%` }} />
          <div className="bg-amber-500" style={{ width: `${mix.short}%` }} />
          <div className="rounded-r-full bg-emerald-500" style={{ width: `${mix.long}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px]">
          <span className="text-white/40">{mix.vista}%<br /><span className="text-white/25">À vista</span></span>
          <span className="text-white/40 text-center">{mix.short}%<br /><span className="text-white/25">Curto (2–6x)</span></span>
          <span className="text-white/40 text-right">{mix.long}%<br /><span className="text-white/25">Longo (7–12x)</span></span>
        </div>
      </div>
      <div className="flex items-center gap-4 pt-1 border-t border-white/[0.06]">
        <div>
          <p className="text-[10px] text-white/35 mb-0.5">Ticket médio</p>
          <p className="text-sm font-bold text-white">{fmtCurrency(client.avgTicket)}</p>
        </div>
        <div className="w-px h-7 bg-white/[0.06]" />
        <div>
          <p className="text-[10px] text-white/35 mb-0.5">Volume mensal</p>
          <p className="text-sm font-bold text-white">{fmtCurrency(client.monthlyVolume)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── StrategyInsightsCard ──────────────────────────────────────────────────────
function StrategyInsightsCard({ rows }: { rows: ReturnType<typeof computeRows> }) {
  const [expanded, setExpanded] = useState(false);
  const insights = useMemo(() => computeInsights(rows), [rows]);
  const avgSpread  = rows.reduce((a, b) => a + b.spread, 0) / rows.length;
  const longAvg    = rows.slice(6).reduce((a, b) => a + b.spread, 0) / 6;
  const shortAvg   = rows.slice(1, 6).reduce((a, b) => a + b.spread, 0) / 5;

  return (
    <div className="bg-[#18181B] rounded-2xl border border-white/[0.06] px-5 py-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(247,38,98,0.15),rgba(119,19,57,0.15))', border: '1px solid rgba(247,38,98,0.25)' }}>
            <svg className="w-4 h-4 text-brand" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Análise da estratégia</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap flex-1">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {ins.type === 'ok' ? (
                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-xs text-white/60">{ins.message}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors whitespace-nowrap shrink-0"
        >
          {expanded ? 'Ocultar detalhes ↑' : 'Ver detalhes →'}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">Spread médio geral</p>
            <p className="text-lg font-bold text-white">{fmtPct(avgSpread)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">Spread curto (2–6x)</p>
            <p className="text-lg font-bold text-amber-300">{fmtPct(shortAvg)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">Spread longo (7–12x)</p>
            <p className="text-lg font-bold text-emerald-400">{fmtPct(longAvg)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OptimizationBanner ────────────────────────────────────────────────────────
function OptimizationBanner({ result, onDismiss }: { result: OptimizationResult; onDismiss: () => void }) {
  return (
    <div className="bg-[#18181B] rounded-2xl border border-emerald-500/20 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Otimização aplicada</span>
        </div>
        <div className="flex items-center gap-2">
          {result.revenueGain !== 0 && (
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-lg border',
              result.revenueGain > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400',
            )}>
              {result.revenueGain > 0 ? '+' : ''}{fmtCurrency(result.revenueGain)}/mês
            </span>
          )}
          {result.avgSpreadDelta !== 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50">
              spread {result.avgSpreadDelta >= 0 ? '+' : ''}{result.avgSpreadDelta.toFixed(2).replace('.', ',')}pp
            </span>
          )}
          <button onClick={onDismiss} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {result.changes.length === 0 ? (
        <p className="text-xs text-white/40">Nenhum ajuste necessário — tabela já está otimizada.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {result.changes.map((c) => (
            <div key={c.installmentIdx} className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{c.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-white/35">{fmtPct(c.oldSpread)}</span>
                <svg className="w-3 h-3 text-white/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-xs font-mono font-semibold text-emerald-400">{fmtPct(c.newSpread)}</span>
              </div>
              <span className="text-[10px] text-white/25 leading-tight truncate">{c.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SavedToast ────────────────────────────────────────────────────────────────
function SavedToast({ visible }: { visible: boolean }) {
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/30 bg-[#111113] shadow-xl transition-all duration-300',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
    )}>
      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm font-medium text-white">Análise salva com sucesso</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MDRAnalyzerPage() {
  const router = useRouter();

  const [strategy, setStrategy]       = useState<StrategyProfile>('aggressive');
  const [prevStrategy]                = useState<StrategyProfile>('balanced');
  const [brand, setBrand]             = useState<BrandKey | 'all'>('visa');
  const [customSpreads, setCustomSpreads] = useState<Record<number, number>>({});
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);

  const { transactionMix: mix, monthlyVolume, avgTicket } = SAMPLE_CLIENT;

  const costData = useMemo(
    () => (brand === 'all' ? getAllBrandsAverage() : SAMPLE_COST_DATA[brand]),
    [brand],
  );

  const rows = useMemo(() => {
    const base = computeRows(costData, strategy);
    return base.map((row, idx) =>
      customSpreads[idx] !== undefined ? applyCustomSpread(row, customSpreads[idx]) : row,
    );
  }, [costData, strategy, customSpreads]);

  const enrichedRows = useMemo(
    () => enrichRows(rows, mix, monthlyVolume, avgTicket),
    [rows, mix, monthlyVolume, avgTicket],
  );

  const metrics = useMemo(() => computeMetrics(rows, mix, monthlyVolume), [rows, mix, monthlyVolume]);

  const prevMetrics = useMemo(() => {
    const prevRows = computeRows(SAMPLE_COST_DATA['visa'], prevStrategy);
    return computeMetrics(prevRows, mix, monthlyVolume);
  }, [prevStrategy, mix, monthlyVolume]);

  const smartSuggestions = useMemo(
    () => computeSmartSuggestions(enrichedRows, mix, monthlyVolume),
    [enrichedRows, mix, monthlyVolume],
  );

  const spreadDelta    = parseFloat((metrics.avgSpread - prevMetrics.avgSpread).toFixed(2));
  const revenueDeltaPct = ((metrics.estimatedRevenue - prevMetrics.estimatedRevenue) / prevMetrics.estimatedRevenue * 100).toFixed(1);
  const stratCfg       = STRATEGY_CONFIG[strategy];

  function handleAutoAdjust(installmentIdx: number, newSpread: number) {
    setCustomSpreads((prev) => ({ ...prev, [installmentIdx]: newSpread }));
  }

  function handleOptimize() {
    const result = computeOptimization(enrichedRows, mix, monthlyVolume);
    setOptimizationResult(result);
    setCustomSpreads((prev) => {
      const next = { ...prev };
      result.changes.forEach((c) => { next[c.installmentIdx] = c.newSpread; });
      return next;
    });
    document.getElementById('mdr-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleStrategyChange(s: StrategyProfile) {
    setStrategy(s);
    setCustomSpreads({});
    setOptimizationResult(null);
  }

  function handleSave() {
    try {
      localStorage.setItem('mdr-analysis', JSON.stringify({ strategy, customSpreads, savedAt: Date.now() }));
    } catch {}
    setSavedVisible(true);
    setTimeout(() => setSavedVisible(false), 2500);
  }

  function handleExport() {
    window.print();
  }

  return (
    <div className="-mx-8 -my-8 flex min-h-screen">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-[#111111] border-b border-white/[0.05] px-8 py-4">
          <div className="flex items-center gap-2 mb-3 text-xs text-white/35">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <button
              className="hover:text-white/60 transition-colors"
              onClick={() => router.push('/proposals')}
            >
              Voltar para propostas
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-white">MDR Analyzer</h1>
              <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                {SAMPLE_CLIENT.name}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                style={{ color: stratCfg.color, borderColor: stratCfg.color + '40', backgroundColor: stratCfg.color + '15' }}
              >
                {stratCfg.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/20 bg-white/5 transition-all"
              >
                Exportar
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/20 bg-white/5 transition-all"
              >
                Salvar análise
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#f72662,#771339)', boxShadow: '0 0 16px rgba(247,38,98,0.3)' }}
                onClick={handleOptimize}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Rodar otimização inteligente
              </button>
            </div>
          </div>
        </div>

        {/* Page body */}
        <div className="flex-1 px-8 py-6 flex flex-col gap-5">
          {/* Metrics + profile */}
          <div className="bg-[#18181B] rounded-2xl border border-white/[0.06] p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-white">Estratégia de Pricing</h2>
              <p className="text-xs text-white/40 mt-0.5">Definição otimizada com base no perfil e comportamento do cliente.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
                <MetricCard
                  label="Spread médio"
                  value={fmtPct(metrics.avgSpread)}
                  sub={`${spreadDelta >= 0 ? '+' : ''}${spreadDelta.toFixed(2).replace('.', ',')}pp vs atual`}
                  subPositive={spreadDelta > 0}
                  chart={<Sparkline trend="up" />}
                />
                <MetricCard
                  label="Spread máximo"
                  value={fmtPct(metrics.maxSpread)}
                  sub={metrics.maxSpreadAt}
                  chart={<Sparkline trend="up" />}
                />
                <MetricCard
                  label="Receita estimada"
                  prefix="R$"
                  value={new Intl.NumberFormat('pt-BR').format(metrics.estimatedRevenue)}
                  sub={`${parseFloat(revenueDeltaPct) >= 0 ? '+' : ''}${revenueDeltaPct}% vs atual`}
                  subPositive={parseFloat(revenueDeltaPct) > 0}
                  chart={<Sparkline trend="up" />}
                />
                <MetricCard
                  label="Concentração de margem"
                  value={`${metrics.marginConcentration}%`}
                  sub="No parcelado 7x–12x"
                  chart={<DonutChart pct={metrics.marginConcentration} />}
                />
              </div>
              <div className="w-[220px] shrink-0">
                <OperationProfileCard />
              </div>
            </div>
          </div>

          {/* Strategy insights strip */}
          <StrategyInsightsCard rows={rows} />

          {/* Optimization before/after banner */}
          {optimizationResult && (
            <OptimizationBanner
              result={optimizationResult}
              onDismiss={() => setOptimizationResult(null)}
            />
          )}

          {/* Smart suggestions */}
          <SmartSuggestionsBlock suggestions={smartSuggestions} />

          {/* MDR Table */}
          <div id="mdr-table">
            <MDRAnalyzerTable
              enrichedRows={enrichedRows}
              strategy={strategy}
              activeBrand={brand}
              onBrandChange={(b) => { setBrand(b); setCustomSpreads({}); setOptimizationResult(null); }}
              onAutoAdjust={handleAutoAdjust}
            />
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <AnalyzerSidebar
        strategy={strategy}
        enrichedRows={enrichedRows}
        onStrategyChange={handleStrategyChange}
        onRecalculate={() => { setCustomSpreads({}); setOptimizationResult(null); }}
        onApplyOptimization={handleOptimize}
      />

      {/* Save toast */}
      <SavedToast visible={savedVisible} />
    </div>
  );
}
