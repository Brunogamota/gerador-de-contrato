'use client';

import { useState } from 'react';
import { MDRMatrix, BRANDS, BRAND_LABELS, BRAND_COLORS, INSTALLMENTS, BrandName, InstallmentNumber, IntlPricing } from '@/types/pricing';
import { INSTALLMENT_LABELS } from '@/components/contract/document/formatters';
import { MarginConfig } from '@/lib/pricing/margin';
import { computeMarginBreakdown, applyMargin } from '@/lib/pricing/margin';
import { updateMatrixEntry } from '@/lib/calculations/mdr';
import { IntlPricingForm } from './IntlPricingForm';
import { cn } from '@/lib/utils';

type PricingMode = 'margin' | 'manual' | 'ai';
type Market = 'brasil' | 'intl';

const AI_LEVEL_ORDER = ['max', 'high', 'medium', 'low'] as const;

type SpreadLevel    = { label: string; description: string; color: string; matrix: MDRMatrix };
type IntlSpreadLevel = { label: string; description: string; color: string; setup: string; pricing: IntlPricing };

interface PricingStepProps {
  costTable: MDRMatrix;
  clientRates: MDRMatrix;
  marginConfig: MarginConfig;
  finalMatrix: MDRMatrix;
  onMarginChange: (c: MarginConfig) => void;
  onFinalMatrixChange: (m: MDRMatrix) => void;
  mcc?: string;
  clientName?: string;
  intlCostPricing: IntlPricing;
  intlProposalPricing: IntlPricing;
  onIntlProposalChange: (v: IntlPricing) => void;
  setupIntl: string;
  onSetupIntlChange: (v: string) => void;
  defaultMarket?: Market;
}

const COLOR_MAP: Record<string, { card: string; badge: string }> = {
  emerald: { card: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  blue:    { card: 'border-blue-200 bg-blue-50',       badge: 'bg-blue-100 text-blue-700'       },
  amber:   { card: 'border-amber-200 bg-amber-50',     badge: 'bg-amber-100 text-amber-700'     },
  rose:    { card: 'border-rose-200 bg-rose-50',       badge: 'bg-rose-100 text-rose-700'       },
};

const ENGINE_LOADING_STEPS = [
  'Analisando perfil do cliente…',
  'Calculando custo base…',
  'Otimizando margens por segmento…',
  'Gerando estratégias de pricing…',
];

// ── spread heatmap colour (5 tiers) ──────────────────────────────────────────
function spreadBg(pp: number): string {
  if (pp <= 0)   return 'bg-red-50 text-red-600';
  if (pp < 0.5)  return 'bg-emerald-50 text-emerald-600';
  if (pp < 1.5)  return 'bg-emerald-100 text-emerald-700';
  if (pp < 3.0)  return 'bg-emerald-200 text-emerald-800';
  if (pp < 5.0)  return 'bg-emerald-300 text-emerald-900';
  return 'bg-emerald-500 text-white';
}

// ── summary stats ─────────────────────────────────────────────────────────────
interface Stats { avg: number; max: number; focusBand: string }

const BANDS = [
  { label: 'À Vista', insts: [1] },
  { label: '2–3x',    insts: [2, 3] },
  { label: '4–6x',    insts: [4, 5, 6] },
  { label: '7–9x',    insts: [7, 8, 9] },
  { label: '10–12x',  insts: [10, 11, 12] },
] as const;

function computeStats(cost: MDRMatrix, final: MDRMatrix): Stats | null {
  const spreads: number[] = [];
  const bandSpreads: Record<string, number[]> = {};

  for (const b of BRANDS) {
    for (const inst of INSTALLMENTS) {
      const c = parseFloat(cost[b as BrandName]?.[inst as InstallmentNumber]?.finalMdr ?? '0');
      const f = parseFloat(final[b as BrandName]?.[inst as InstallmentNumber]?.finalMdr ?? '0');
      if (c > 0 && f > 0) {
        const sp = +(f - c).toFixed(4);
        spreads.push(sp);
        const band = BANDS.find((bd) => (bd.insts as readonly number[]).includes(inst as number));
        if (band) {
          bandSpreads[band.label] = bandSpreads[band.label] ?? [];
          bandSpreads[band.label].push(sp);
        }
      }
    }
  }

  if (!spreads.length) return null;

  const avg = +(spreads.reduce((a, b) => a + b, 0) / spreads.length).toFixed(2);
  const max = +Math.max(...spreads).toFixed(2);
  const focusBand = Object.entries(bandSpreads).sort(
    ([, a], [, b]) => (b.reduce((s, v) => s + v, 0) / b.length) - (a.reduce((s, v) => s + v, 0) / a.length),
  )[0]?.[0] ?? '—';

  return { avg, max, focusBand };
}

// ── sub-components ────────────────────────────────────────────────────────────
function SummaryBar({ cost, final }: { cost: MDRMatrix; final: MDRMatrix }) {
  const s = computeStats(cost, final);
  if (!s) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {[
        { label: 'Spread médio',  value: `+${s.avg.toFixed(2).replace('.', ',')} pp`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { label: 'Spread máximo', value: `+${s.max.toFixed(2).replace('.', ',')} pp`, color: 'text-amber-700 bg-amber-50 border-amber-200'       },
        { label: 'Foco',          value: s.focusBand,                                 color: 'text-blue-700 bg-blue-50 border-blue-200'            },
      ].map((item) => (
        <div key={item.label} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium', item.color)}>
          <span className="text-ink-500 font-normal">{item.label}</span>
          <span className="font-semibold font-mono">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function BrandTabs({ selected, onChange, matrix }: { selected: BrandName; onChange: (b: BrandName) => void; matrix: MDRMatrix }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit flex-wrap">
      {BRANDS.map((b) => {
        const hasData = Object.values(matrix[b as BrandName]).some((e) => e.finalMdr);
        return (
          <button key={b} onClick={() => onChange(b as BrandName)}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
              selected === b ? 'bg-white shadow-sm text-ink-950' : 'text-ink-500 hover:text-ink-800')}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: hasData ? BRAND_COLORS[b as BrandName] : '#d1d5db' }} />
            {BRAND_LABELS[b as BrandName]}
          </button>
        );
      })}
    </div>
  );
}

// Unified heatmap table — optionally editable
function HeatmapTable({
  costTable, finalMatrix, editable = false, blockedCell, onUpdate,
}: {
  costTable: MDRMatrix;
  finalMatrix: MDRMatrix;
  editable?: boolean;
  blockedCell?: { brand: BrandName; inst: InstallmentNumber; cost: number } | null;
  onUpdate?: (brand: BrandName, inst: InstallmentNumber, field: 'mdrBase' | 'anticipationRate', val: string) => void;
}) {
  const [brand, setBrand] = useState<BrandName>('visa');

  return (
    <div className="flex flex-col gap-3">
      <BrandTabs selected={brand} onChange={setBrand} matrix={finalMatrix} />

      {blockedCell && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span><strong>Abaixo do custo:</strong> mínimo <strong className="font-mono">{blockedCell.cost.toFixed(2).replace('.', ',')}%</strong></span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink-200">
        <table className="w-full text-xs" style={{ minWidth: editable ? '640px' : '480px' }}>
          <thead>
            <tr className="bg-ink-50 border-b-2 border-ink-200">
              <th className="px-3 py-3 text-left text-[10px] font-semibold text-ink-500 uppercase tracking-[0.08em] min-w-[120px]">Modo</th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-ink-400 uppercase tracking-[0.08em] w-24">Custo (%)</th>
              {editable ? (
                <>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold text-ink-600 uppercase tracking-[0.08em] bg-brand/5 border-l-2 border-brand/20 w-28">Tx (%)</th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold text-ink-600 uppercase tracking-[0.08em] bg-brand/5 w-28">Ant. (%)</th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold text-ink-800 uppercase tracking-[0.08em] bg-brand/5 w-28">Final (%)</th>
                </>
              ) : (
                <th className="px-3 py-3 text-center text-[10px] font-semibold text-ink-700 uppercase tracking-[0.08em] w-28">Taxa Final (%)</th>
              )}
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-emerald-700 uppercase tracking-[0.08em] bg-emerald-50/60 border-l-2 border-emerald-200 w-24">Spread</th>
            </tr>
          </thead>
          <tbody>
            {INSTALLMENTS.map((inst, i) => {
              const costEntry = costTable[brand]?.[inst as InstallmentNumber];
              const entry     = finalMatrix[brand]?.[inst as InstallmentNumber];
              const costFinal = costEntry?.finalMdr ? parseFloat(costEntry.finalMdr) : null;
              const propFinal = entry?.finalMdr     ? parseFloat(entry.finalMdr)     : null;
              const spread    = propFinal !== null && costFinal !== null ? +(propFinal - costFinal).toFixed(2) : null;
              const isBlocked = blockedCell?.brand === brand && blockedCell?.inst === (inst as InstallmentNumber);

              return (
                <tr key={inst} className={cn('border-b border-ink-100 last:border-0 transition-colors', i % 2 === 0 ? 'bg-white hover:bg-ink-50/40' : 'bg-ink-50/20 hover:bg-ink-50/50')}>
                  <td className="px-3 py-2.5 text-ink-800 text-[13px] font-medium">{INSTALLMENT_LABELS[inst as number]}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-ink-400">
                    {costFinal !== null ? costFinal.toFixed(2).replace('.', ',') + '%' : '—'}
                  </td>

                  {editable ? (
                    <>
                      <td className={cn('px-2 py-2 border-l-2', isBlocked ? 'bg-red-50 border-red-200' : 'bg-brand/5 border-brand/20')}>
                        <input type="text" value={entry?.mdrBase ?? ''}
                          onChange={(e) => onUpdate?.(brand, inst as InstallmentNumber, 'mdrBase', e.target.value)}
                          className={cn('w-full text-center rounded-lg border px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1',
                            isBlocked ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-300'
                              : entry?.mdrBase ? 'border-emerald-200 bg-white text-emerald-800 focus:ring-brand'
                              : 'border-ink-200 bg-white text-ink-400 focus:ring-brand')}
                          placeholder="—"
                        />
                      </td>
                      <td className={cn('px-2 py-2', isBlocked ? 'bg-red-50' : 'bg-brand/5')}>
                        <input type="text" value={entry?.anticipationRate ?? ''}
                          onChange={(e) => onUpdate?.(brand, inst as InstallmentNumber, 'anticipationRate', e.target.value)}
                          className={cn('w-full text-center rounded-lg border px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1',
                            isBlocked ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-300'
                              : 'border-ink-200 bg-white text-ink-600 focus:ring-brand')}
                          placeholder="0"
                        />
                      </td>
                      <td className={cn('px-3 py-2.5 text-center font-mono font-semibold text-[13px] bg-brand/5', isBlocked ? 'text-red-600' : 'text-ink-900')}>
                        {propFinal !== null ? propFinal.toFixed(2).replace('.', ',') + '%' : '—'}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2.5 text-center font-mono font-semibold text-[13px] text-ink-900">
                      {propFinal !== null ? propFinal.toFixed(2).replace('.', ',') + '%' : '—'}
                    </td>
                  )}

                  <td className={cn('px-3 py-2.5 text-center font-mono font-semibold text-[13px] border-l-2 border-emerald-200',
                    spread !== null ? spreadBg(spread) : 'text-ink-300 bg-emerald-50/20')}>
                    {spread !== null ? (spread >= 0 ? '+' : '') + spread.toFixed(2).replace('.', ',') + ' pp' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PricingStep({
  costTable, clientRates, marginConfig, finalMatrix,
  onMarginChange, onFinalMatrixChange, mcc, clientName,
  intlCostPricing, intlProposalPricing, onIntlProposalChange,
  setupIntl, onSetupIntlChange, defaultMarket,
}: PricingStepProps) {
  const [market, setMarket]               = useState<Market>(defaultMarket ?? 'brasil');
  const [mode,   setMode]                 = useState<PricingMode>('margin');
  const [blockedCell, setBlockedCell]     = useState<{ brand: BrandName; inst: InstallmentNumber; cost: number } | null>(null);
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiLevels, setAiLevels]           = useState<Record<string, SpreadLevel> | null>(null);
  const [aiRationale, setAiRationale]     = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [engineStep, setEngineStep]       = useState(0);

  const [intlAiLoading, setIntlAiLoading]         = useState(false);
  const [intlAiLevels, setIntlAiLevels]           = useState<Record<string, IntlSpreadLevel> | null>(null);
  const [intlAiRationale, setIntlAiRationale]     = useState('');
  const [intlSelectedLevel, setIntlSelectedLevel] = useState<string | null>(null);

  const intlCostHasData = !!(intlCostPricing.processingRate && intlCostPricing.processingRate !== '' && intlCostPricing.processingRate !== '0.00');

  async function handleAiSuggest() {
    setAiLoading(true); setAiLevels(null); setSelectedLevel(null); setAiRationale(''); setEngineStep(0);
    const iv = setInterval(() => setEngineStep((s) => (s + 1) % ENGINE_LOADING_STEPS.length), 300);
    try {
      const res = await fetch('/api/proposals/suggest-pricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costTable, clientRates, mcc }),
      });
      if (!res.ok) throw new Error();
      const { levels, rationale } = await res.json() as { levels: Record<string, SpreadLevel>; rationale: string };
      setAiLevels(levels); setAiRationale(rationale);
    } catch { alert('Erro ao gerar estratégias. Tente novamente.'); }
    finally { clearInterval(iv); setAiLoading(false); }
  }

  async function handleIntlAiSuggest() {
    if (!intlCostHasData) { alert('Preencha o Processing Rate no passo Custo antes de gerar estratégias.'); return; }
    setIntlAiLoading(true); setIntlAiLevels(null); setIntlSelectedLevel(null); setIntlAiRationale(''); setEngineStep(0);
    const iv = setInterval(() => setEngineStep((s) => (s + 1) % ENGINE_LOADING_STEPS.length), 300);
    try {
      const res = await fetch('/api/proposals/suggest-intl-pricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costPricing: intlCostPricing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      setIntlAiLevels(data.levels); setIntlAiRationale(data.rationale);
    } catch (err) { alert(`Erro: ${err instanceof Error ? err.message : 'Tente novamente.'}`); }
    finally { clearInterval(iv); setIntlAiLoading(false); }
  }

  function selectLevel(key: string) {
    setSelectedLevel(key);
    onFinalMatrixChange(aiLevels![key].matrix);
  }

  function updateCell(brand: BrandName, inst: InstallmentNumber, field: 'mdrBase' | 'anticipationRate', value: string) {
    const newMatrix = updateMatrixEntry(finalMatrix, brand, inst, field, value);
    const newFinal  = parseFloat(newMatrix[brand][inst].finalMdr ?? '0');
    const costFinal = parseFloat(costTable[brand]?.[inst]?.finalMdr ?? '0');
    if (costFinal > 0 && newFinal > 0 && newFinal < costFinal) {
      setBlockedCell({ brand, inst, cost: costFinal });
      setTimeout(() => setBlockedCell(null), 3000);
      return;
    }
    setBlockedCell(null);
    onFinalMatrixChange(newMatrix);
  }

  function switchMode(m: PricingMode) {
    if (m === 'margin') onFinalMatrixChange(applyMargin(costTable, marginConfig));
    setMode(m);
  }

  // Matrix currently displayed (for engine mode: selected level or finalMatrix)
  const displayMatrix = (mode === 'ai' && selectedLevel && aiLevels)
    ? aiLevels[selectedLevel].matrix
    : finalMatrix;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-950 mb-1">Precificação Final</h2>
        <p className="text-sm text-ink-500">Defina as taxas que aparecerão na proposta.</p>
      </div>

      {/* Market tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
        {([{ id: 'brasil', label: '🇧🇷 Brasil (MDR)' }, { id: 'intl', label: '🌐 Internacional' }] as const).map((t) => (
          <button key={t.id} onClick={() => setMarket(t.id)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              market === t.id ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-800')}
          >{t.label}</button>
        ))}
      </div>

      {/* ══ BRASIL ══ */}
      {market === 'brasil' && (
        <>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" />
            </svg>
            <span><strong>Uso interno:</strong> custos e margens nunca aparecem no PDF.</span>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'margin', label: 'Margem global',          icon: '%' },
              { id: 'manual', label: 'Editar célula a célula', icon: '✏' },
              { id: 'ai',     label: 'Engine (4 estratégias)', icon: '◈' },
            ] as const).map((m) => (
              <button key={m.id} onClick={() => switchMode(m.id)}
                className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  mode === m.id ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-ink-700 border-ink-200 hover:border-brand/40')}
              >
                <span className="font-mono">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>

          {/* Summary bar — always visible when there's data */}
          <SummaryBar cost={costTable} final={finalMatrix} />

          {/* ── MARGEM GLOBAL ── */}
          {mode === 'margin' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end gap-5 p-5 rounded-2xl border border-ink-200 bg-ink-50">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Tipo</label>
                  <div className="flex gap-2">
                    {(['percent', 'fixed'] as const).map((t) => (
                      <button key={t} type="button"
                        onClick={() => { const c = { ...marginConfig, type: t }; onMarginChange(c); onFinalMatrixChange(applyMargin(costTable, c)); }}
                        className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                          marginConfig.type === t ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-ink-700 border-ink-200 hover:border-brand/50')}
                      >{t === 'percent' ? 'Percentual (%)' : 'Fixo (pp)'}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">
                    {marginConfig.type === 'percent' ? 'Margem (% do custo)' : 'Margem (pontos pp)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500 pointer-events-none">+</span>
                    <input type="number" step="0.01" min="0" value={marginConfig.value}
                      onChange={(e) => { const c = { ...marginConfig, value: e.target.value }; onMarginChange(c); onFinalMatrixChange(applyMargin(costTable, c)); }}
                      className="pl-7 pr-4 py-2 rounded-xl border border-ink-200 bg-white text-sm font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand w-36"
                    />
                  </div>
                </div>
              </div>
              <HeatmapTable costTable={costTable} finalMatrix={finalMatrix} />
            </div>
          )}

          {/* ── MANUAL ── */}
          {mode === 'manual' && (
            <HeatmapTable
              costTable={costTable}
              finalMatrix={finalMatrix}
              editable
              blockedCell={blockedCell}
              onUpdate={updateCell}
            />
          )}

          {/* ── ENGINE ── */}
          {mode === 'ai' && (
            <div className="flex flex-col gap-5">
              {/* Engine card */}
              <div className="p-5 rounded-2xl border border-ink-200 bg-ink-50 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand font-bold text-lg">◈</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 mb-1">Engine de Pricing — 4 estratégias</p>
                    <p className="text-xs text-ink-500 leading-relaxed">
                      Classifica o perfil pelo MCC e gera 4 estratégias de precificação. Selecione uma e edite direto na tabela abaixo.
                    </p>
                    {mcc && <p className="text-xs text-ink-400 mt-1">MCC: <span className="font-mono text-ink-600">{mcc}</span>{clientName && ` · ${clientName}`}</p>}
                  </div>
                </div>
                <button onClick={handleAiSuggest} disabled={aiLoading}
                  className={cn('self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                    aiLoading ? 'bg-ink-400 cursor-not-allowed' : 'bg-brand hover:bg-brand/90 shadow-sm')}
                >
                  {aiLoading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{ENGINE_LOADING_STEPS[engineStep]}</>
                    : <>◈ {aiLevels ? 'Recalcular' : 'Gerar estratégias'}</>}
                </button>
              </div>

              {aiLevels && (
                <>
                  {/* Rationale */}
                  {aiRationale && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                      <span className="text-blue-400 flex-shrink-0">💡</span>
                      <p className="text-sm text-blue-800 leading-relaxed">{aiRationale}</p>
                    </div>
                  )}

                  {/* Strategy cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AI_LEVEL_ORDER.filter((k) => aiLevels[k]).map((key) => {
                      const level = aiLevels[key];
                      const c = COLOR_MAP[level.color] ?? COLOR_MAP.blue;
                      const isSelected = selectedLevel === key;
                      return (
                        <div key={key}
                          className={cn('rounded-2xl border-2 p-4 flex flex-col gap-2 transition-all cursor-pointer',
                            isSelected ? `${c.card} ring-2 ring-offset-1` : `${c.card} opacity-80 hover:opacity-100`)}
                          onClick={() => selectLevel(key)}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', c.badge)}>{level.label}</span>
                            {isSelected && <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Ativa</span>}
                          </div>
                          <p className="text-xs text-ink-500">{level.description}</p>
                          <div className="flex gap-4 text-xs font-mono">
                            {(['visa', 'mastercard'] as BrandName[]).map((b) => {
                              const e1  = level.matrix[b]?.[1  as InstallmentNumber];
                              const e12 = level.matrix[b]?.[12 as InstallmentNumber];
                              const v = (e: typeof e1) => e?.finalMdr ? parseFloat(e.finalMdr).toFixed(2) + '%' : '—';
                              return (
                                <div key={b} className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: BRAND_COLORS[b] }}>{BRAND_LABELS[b]}</span>
                                  <span className="text-ink-600">1x: <strong className="text-ink-900">{v(e1)}</strong></span>
                                  <span className="text-ink-600">12x: <strong className="text-ink-900">{v(e12)}</strong></span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inline edit + heatmap — always shown after level selected */}
                  {selectedLevel && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide">
                          Tabela — {aiLevels[selectedLevel].label}
                          <span className="ml-2 text-ink-400 font-normal normal-case">edite direto abaixo</span>
                        </p>
                      </div>
                      <SummaryBar cost={costTable} final={displayMatrix} />
                      <HeatmapTable
                        costTable={costTable}
                        finalMatrix={displayMatrix}
                        editable
                        blockedCell={blockedCell}
                        onUpdate={updateCell}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ══ INTERNACIONAL ══ */}
      {market === 'intl' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            <span>Esses valores aparecerão na proposta internacional para o cliente.</span>
          </div>

          {/* Engine intl */}
          <div className="p-5 rounded-2xl border border-ink-200 bg-ink-50 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand font-bold text-lg">◈</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900 mb-1">Engine de Pricing Internacional — 4 estratégias</p>
                <p className="text-xs text-ink-500 leading-relaxed">
                  {intlCostHasData
                    ? 'Calcula 4 estratégias com markup progressivo. Escolha uma para aplicar automaticamente.'
                    : 'Preencha o Processing Rate no passo Custo para habilitar o engine.'}
                </p>
              </div>
            </div>
            <button onClick={handleIntlAiSuggest} disabled={intlAiLoading || !intlCostHasData}
              className={cn('self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                intlAiLoading || !intlCostHasData ? 'bg-ink-300 cursor-not-allowed' : 'bg-brand hover:bg-brand/90 shadow-sm')}
            >
              {intlAiLoading
                ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{ENGINE_LOADING_STEPS[engineStep]}</>
                : <>◈ {intlAiLevels ? 'Recalcular' : 'Gerar estratégias'}</>}
            </button>
          </div>

          {intlAiLevels && (
            <div className="flex flex-col gap-4">
              {intlAiRationale && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-blue-400 flex-shrink-0">💡</span>
                  <p className="text-sm text-blue-800 leading-relaxed">{intlAiRationale}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AI_LEVEL_ORDER.filter((k) => intlAiLevels[k]).map((key) => {
                  const level = intlAiLevels[key];
                  const c = COLOR_MAP[level.color] ?? COLOR_MAP.blue;
                  const isSelected = intlSelectedLevel === key;
                  return (
                    <div key={key}
                      className={cn('rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all cursor-pointer hover:shadow-sm',
                        isSelected ? `${c.card} ring-2 ring-offset-1` : `${c.card} opacity-90 hover:opacity-100`)}
                      onClick={() => { setIntlSelectedLevel(key); onIntlProposalChange(intlAiLevels![key].pricing); onSetupIntlChange(intlAiLevels![key].setup); }}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', c.badge)}>{level.label}</span>
                        {isSelected && <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">✓ Aplicado</span>}
                      </div>
                      <p className="text-xs text-ink-500">{level.description}</p>
                      <div className="flex gap-6 text-xs font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-ink-500">Processing</span>
                          <span className="font-semibold text-ink-800">{level.pricing.processingRate ? `${level.pricing.processingRate}%` : '—'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-ink-500">Connect</span>
                          <span className="font-semibold text-ink-800">{level.pricing.connectPayoutRate ? `${level.pricing.connectPayoutRate}%` : '—'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 ml-auto">
                          <span className="text-ink-500">Setup</span>
                          <span className="font-semibold text-ink-800">{level.setup ? `$${parseFloat(level.setup).toLocaleString('en-US')}` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Setup OPP */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-ink-200 bg-ink-50">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-700">Setup OPP Internacional</label>
              <p className="text-xs text-ink-500">Valor único cobrado na adesão para operação internacional</p>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-sm text-ink-500 font-mono">$</span>
              <input type="text" value={setupIntl} onChange={(e) => onSetupIntlChange(e.target.value)} placeholder="0.00"
                className="w-28 px-3 py-2 text-sm font-mono border border-ink-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>

          <IntlPricingForm value={intlProposalPricing} onChange={onIntlProposalChange} />

          {intlCostPricing.processingRate && (
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">Custo do fornecedor (referência — uso interno)</p>
              <IntlPricingForm value={intlCostPricing} readOnly />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
