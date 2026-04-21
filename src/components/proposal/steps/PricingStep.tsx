'use client';

import { useState, Fragment } from 'react';
import { MDRMatrix, BRANDS, BRAND_LABELS, INSTALLMENTS, BrandName, InstallmentNumber, IntlPricing } from '@/types/pricing';
import { MarginConfig } from '@/lib/pricing/margin';
import { computeMarginBreakdown, applyMargin } from '@/lib/pricing/margin';
import { updateMatrixEntry } from '@/lib/calculations/mdr';
import { IntlPricingForm } from './IntlPricingForm';
import { cn } from '@/lib/utils';

type PricingMode = 'margin' | 'manual' | 'ai';
type Market = 'brasil' | 'intl';

// Display order: most aggressive (cheapest for client) → most conservative (max margin)
const AI_LEVEL_ORDER = ['max', 'high', 'medium', 'low'] as const;

type SpreadLevel = {
  label: string;
  description: string;
  color: string;
  matrix: MDRMatrix;
};

type IntlSpreadLevel = {
  label: string;
  description: string;
  color: string;
  setup: string;
  pricing: IntlPricing;
};

interface PricingStepProps {
  costTable: MDRMatrix;
  clientRates: MDRMatrix;
  marginConfig: MarginConfig;
  finalMatrix: MDRMatrix;
  onMarginChange: (config: MarginConfig) => void;
  onFinalMatrixChange: (matrix: MDRMatrix) => void;
  mcc?: string;
  clientName?: string;
  intlCostPricing: IntlPricing;
  intlProposalPricing: IntlPricing;
  onIntlProposalChange: (v: IntlPricing) => void;
  setupIntl: string;
  onSetupIntlChange: (v: string) => void;
}

const COLOR_MAP: Record<string, { card: string; badge: string; btn: string }> = {
  emerald: { card: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  blue:    { card: 'border-blue-200 bg-blue-50',       badge: 'bg-blue-100 text-blue-700',       btn: 'bg-blue-600 hover:bg-blue-700'       },
  amber:   { card: 'border-amber-200 bg-amber-50',     badge: 'bg-amber-100 text-amber-700',     btn: 'bg-amber-600 hover:bg-amber-700'     },
  rose:    { card: 'border-rose-200 bg-rose-50',       badge: 'bg-rose-100 text-rose-700',       btn: 'bg-rose-600 hover:bg-rose-700'       },
};

export function PricingStep({
  costTable, clientRates, marginConfig, finalMatrix,
  onMarginChange, onFinalMatrixChange, mcc, clientName,
  intlCostPricing, intlProposalPricing, onIntlProposalChange,
  setupIntl, onSetupIntlChange,
}: PricingStepProps) {
  const [market, setMarket] = useState<Market>('brasil');
  const [mode, setMode] = useState<PricingMode>('margin');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRationale, setAiRationale] = useState('');
  const [aiLevels, setAiLevels] = useState<Record<string, SpreadLevel> | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  // Intl AI state
  const [intlAiLoading, setIntlAiLoading] = useState(false);
  const [intlAiRationale, setIntlAiRationale] = useState('');
  const [intlAiLevels, setIntlAiLevels] = useState<Record<string, IntlSpreadLevel> | null>(null);
  const [intlSelectedLevel, setIntlSelectedLevel] = useState<string | null>(null);

  async function handleAiSuggest() {
    setAiLoading(true);
    setAiRationale('');
    setAiLevels(null);
    setSelectedLevel(null);
    try {
      const res = await fetch('/api/proposals/suggest-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costTable, clientRates, mcc }),
      });
      if (!res.ok) throw new Error();
      const { levels, rationale } = await res.json() as { levels: Record<string, SpreadLevel>; rationale: string };
      setAiLevels(levels);
      setAiRationale(rationale);
    } catch {
      alert('Erro ao gerar sugestão. Verifique a OPENAI_API_KEY.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleIntlAiSuggest() {
    const hasData = Object.values(intlCostPricing).some((v) => v && v !== '' && v !== '0.00');
    if (!hasData) {
      alert('Preencha primeiro os custos do fornecedor internacional na aba Custo (passo anterior).');
      return;
    }
    setIntlAiLoading(true);
    setIntlAiRationale('');
    setIntlAiLevels(null);
    setIntlSelectedLevel(null);
    try {
      const res = await fetch('/api/proposals/suggest-intl-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costPricing: intlCostPricing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      setIntlAiLevels(data.levels as Record<string, IntlSpreadLevel>);
      setIntlAiRationale(data.rationale as string);
    } catch (err) {
      alert(`Erro ao gerar sugestão: ${err instanceof Error ? err.message : 'Verifique a OPENAI_API_KEY.'}`);
    } finally {
      setIntlAiLoading(false);
    }
  }

  function selectIntlLevel(key: string) {
    setIntlSelectedLevel(key);
    onIntlProposalChange(intlAiLevels![key].pricing);
    onSetupIntlChange(intlAiLevels![key].setup);
  }

  function selectLevel(key: string) {
    setSelectedLevel(key);
    onFinalMatrixChange(aiLevels![key].matrix);
  }

  function acceptAndEdit() {
    setAiLevels(null);
    setMode('manual');
  }

  function updateCell(brand: BrandName, inst: InstallmentNumber, field: 'mdrBase' | 'anticipationRate', value: string) {
    onFinalMatrixChange(updateMatrixEntry(finalMatrix, brand, inst, field, value));
  }

  function switchMode(m: PricingMode) {
    if (m === 'margin') onFinalMatrixChange(applyMargin(costTable, marginConfig));
    setMode(m);
  }

  const intlCostHasData = Object.values(intlCostPricing).some((v) => v && v !== '' && v !== '0.00');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-950 mb-1">Precificação Final</h2>
        <p className="text-sm text-ink-500">Defina as taxas que aparecerão na proposta.</p>
      </div>

      {/* Market tab selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
        {([
          { id: 'brasil', label: '🇧🇷 Brasil (MDR)' },
          { id: 'intl',   label: '🌐 Internacional' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setMarket(t.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              market === t.id
                ? 'bg-white text-ink-950 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {t.label}
          </button>
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
              { id: 'margin', label: 'Margem global', icon: '%' },
              { id: 'manual', label: 'Editar célula a célula', icon: '✏' },
              { id: 'ai',     label: 'Sugestão IA (4 níveis)', icon: '✦' },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  mode === m.id
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-white text-ink-700 border-ink-200 hover:border-brand/40',
                )}
              >
                <span className="font-mono">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* ── MARGEM GLOBAL ── */}
          {mode === 'margin' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end gap-5 p-5 rounded-2xl border border-ink-200 bg-ink-50">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Tipo</label>
                  <div className="flex gap-2">
                    {(['percent', 'fixed'] as const).map((t) => (
                      <button key={t} type="button"
                        onClick={() => {
                          const c = { ...marginConfig, type: t };
                          onMarginChange(c);
                          onFinalMatrixChange(applyMargin(costTable, c));
                        }}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                          marginConfig.type === t ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-ink-700 border-ink-200 hover:border-brand/50',
                        )}
                      >
                        {t === 'percent' ? 'Percentual (%)' : 'Fixo (pp)'}
                      </button>
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
                      onChange={(e) => {
                        const c = { ...marginConfig, value: e.target.value };
                        onMarginChange(c);
                        onFinalMatrixChange(applyMargin(costTable, c));
                      }}
                      className="pl-7 pr-4 py-2 rounded-xl border border-ink-200 bg-white text-sm font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand w-36"
                    />
                  </div>
                </div>
              </div>
              <MarginPreviewTable costTable={costTable} finalMatrix={finalMatrix} />
            </div>
          )}

          {/* ── MANUAL ── */}
          {mode === 'manual' && (
            <div className="overflow-x-auto rounded-xl border border-ink-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-ink-50 border-b border-ink-200">
                    <th className="px-3 py-2 text-left font-semibold text-ink-600 w-12">Parc.</th>
                    {BRANDS.map((b) => (
                      <th key={b} colSpan={2} className="px-2 py-2 text-center font-semibold text-ink-700 border-l border-ink-100">{BRAND_LABELS[b]}</th>
                    ))}
                  </tr>
                  <tr className="bg-ink-50/50 border-b border-ink-100">
                    <th className="px-3 py-1" />
                    {BRANDS.map((b) => (
                      <Fragment key={b}>
                        <th className="px-2 py-1 text-center font-normal text-ink-500 border-l border-ink-100">Base</th>
                        <th className="px-2 py-1 text-center font-normal text-ink-400">Ant.</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INSTALLMENTS.map((inst) => (
                    <tr key={inst} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                      <td className="px-3 py-1.5 font-semibold text-ink-700">{inst}x</td>
                      {BRANDS.map((b) => {
                        const entry = finalMatrix[b as BrandName][inst as InstallmentNumber];
                        return (
                          <Fragment key={b}>
                            <td className="px-1 py-1 border-l border-ink-100">
                              <input type="text" value={entry?.mdrBase ?? ''}
                                onChange={(e) => updateCell(b as BrandName, inst as InstallmentNumber, 'mdrBase', e.target.value)}
                                className={cn(
                                  'w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand',
                                  entry?.mdrBase ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-ink-200 bg-white text-ink-500',
                                )}
                                placeholder="—"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input type="text" value={entry?.anticipationRate ?? ''}
                                onChange={(e) => updateCell(b as BrandName, inst as InstallmentNumber, 'anticipationRate', e.target.value)}
                                className="w-14 text-center rounded-lg border border-ink-200 bg-white px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand text-ink-600"
                                placeholder="0"
                              />
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── IA ── */}
          {mode === 'ai' && (
            <div className="flex flex-col gap-5">
              <div className="p-5 rounded-2xl border border-ink-200 bg-ink-50 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand font-bold text-lg">✦</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 mb-1">Sugestão de pricing por IA — 4 níveis</p>
                    <p className="text-xs text-ink-500 leading-relaxed">
                      A IA analisa seu custo e as taxas atuais do cliente e gera 4 opções de pricing.
                      Todos os níveis são melhores que a taxa atual do cliente.
                      Escolha um nível e edite livremente.
                    </p>
                    {mcc && <p className="text-xs text-ink-400 mt-1">MCC: <span className="font-mono text-ink-600">{mcc}</span>{clientName && ` · ${clientName}`}</p>}
                  </div>
                </div>
                <button onClick={handleAiSuggest} disabled={aiLoading}
                  className={cn(
                    'self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                    aiLoading ? 'bg-ink-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-700 shadow-sm',
                  )}
                >
                  {aiLoading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Gerando 4 níveis…</>
                    : <>✦ {aiLevels ? 'Gerar novamente' : 'Gerar sugestões'}</>}
                </button>
              </div>

              {aiLevels && (
                <div className="flex flex-col gap-4">
                  {aiRationale && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                      <span className="text-blue-400 flex-shrink-0">💡</span>
                      <p className="text-sm text-blue-800 leading-relaxed">{aiRationale}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AI_LEVEL_ORDER.filter((k) => aiLevels[k]).map((key) => {
                      const level = aiLevels[key];
                      const c = COLOR_MAP[level.color] ?? COLOR_MAP.blue;
                      const isSelected = selectedLevel === key;
                      return (
                        <div key={key}
                          className={cn(
                            'rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all cursor-pointer',
                            isSelected ? `${c.card} border-opacity-100 ring-2 ring-offset-1 ring-current` : `${c.card} border-opacity-60 hover:border-opacity-100`,
                          )}
                          onClick={() => selectLevel(key)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', c.badge)}>
                                {level.label}
                              </span>
                              <p className="text-xs text-ink-500 mt-1">{level.description}</p>
                            </div>
                            {isSelected && (
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Selecionado</span>
                            )}
                          </div>

                          <div className="flex gap-3 text-xs font-mono">
                            {['visa', 'mastercard'].map((b) => {
                              const e1  = level.matrix[b as BrandName]?.[1 as InstallmentNumber];
                              const e6  = level.matrix[b as BrandName]?.[6 as InstallmentNumber];
                              const e12 = level.matrix[b as BrandName]?.[12 as InstallmentNumber];
                              return (
                                <div key={b} className="flex flex-col gap-1">
                                  <span className="text-ink-400 capitalize">{b === 'mastercard' ? 'Master' : b}</span>
                                  <span>1x: <strong>{e1?.finalMdr ? `${parseFloat(e1.finalMdr).toFixed(2)}%` : '—'}</strong></span>
                                  <span>6x: <strong>{e6?.finalMdr ? `${parseFloat(e6.finalMdr).toFixed(2)}%` : '—'}</strong></span>
                                  <span>12x: <strong>{e12?.finalMdr ? `${parseFloat(e12.finalMdr).toFixed(2)}%` : '—'}</strong></span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedLevel && (
                    <div className="flex gap-3 pt-2">
                      <button onClick={acceptAndEdit}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-700 shadow-sm transition-all"
                      >
                        ✓ Usar nível selecionado e editar →
                      </button>
                    </div>
                  )}

                  {selectedLevel && (
                    <div>
                      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                        Tabela completa — {aiLevels[selectedLevel].label}
                      </p>
                      <MarginPreviewTable costTable={costTable} finalMatrix={aiLevels[selectedLevel].matrix} />
                    </div>
                  )}
                </div>
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

          {/* AI suggestion for intl — 4 levels */}
          <div className="p-5 rounded-2xl border border-ink-200 bg-ink-50 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand font-bold text-lg">✦</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900 mb-1">Sugestão de pricing por IA — 4 níveis</p>
                <p className="text-xs text-ink-500 leading-relaxed">
                  {intlCostHasData
                    ? 'A IA gera 4 opções do mais agressivo ao mais rentável (markup até 700%) com setup por nível. Escolha um nível para aplicar automaticamente.'
                    : 'Preencha os custos do fornecedor no passo Custo para habilitar a sugestão por IA.'}
                </p>
              </div>
            </div>
            <button onClick={handleIntlAiSuggest} disabled={intlAiLoading || !intlCostHasData}
              className={cn(
                'self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                intlAiLoading || !intlCostHasData ? 'bg-ink-300 cursor-not-allowed' : 'bg-brand hover:bg-brand/90 shadow-sm',
              )}
            >
              {intlAiLoading
                ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Gerando 4 níveis…</>
                : <>✦ {intlAiLevels ? 'Gerar novamente' : 'Gerar sugestões'}</>}
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
                      className={cn(
                        'rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all cursor-pointer hover:shadow-sm',
                        isSelected
                          ? `${c.card} ring-2 ring-offset-1`
                          : `${c.card} opacity-90 hover:opacity-100`,
                      )}
                      onClick={() => selectIntlLevel(key)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', c.badge)}>
                            {level.label}
                          </span>
                          <p className="text-xs text-ink-500 mt-1 leading-relaxed">{level.description}</p>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">✓ Aplicado</span>
                        )}
                      </div>

                      <div className="flex gap-6 text-xs font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-ink-500 font-medium">Processing</span>
                          <span className="font-semibold text-ink-800">{level.pricing.processingRate ? `${level.pricing.processingRate}%` : '—'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-ink-500 font-medium">Connect payout</span>
                          <span className="font-semibold text-ink-800">{level.pricing.connectPayoutRate ? `${level.pricing.connectPayoutRate}%` : '—'}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 ml-auto">
                          <span className="text-ink-500 font-medium">Setup</span>
                          <span className="font-semibold text-ink-800">{level.setup ? `$${parseFloat(level.setup).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Setup OPP Internacional */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-ink-200 bg-ink-50">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-700">Setup OPP Internacional</label>
              <p className="text-xs text-ink-500">Valor único cobrado na adesão para operação internacional</p>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-sm text-ink-500 font-mono">$</span>
              <input
                type="text"
                value={setupIntl}
                onChange={e => onSetupIntlChange(e.target.value)}
                placeholder="0.00"
                className="w-28 px-3 py-2 text-sm font-mono border border-ink-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>

          <IntlPricingForm
            value={intlProposalPricing}
            onChange={onIntlProposalChange}
          />

          {/* Reference: cost from supplier */}
          {intlCostPricing.processingRate && (
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">
                Custo do fornecedor (referência — uso interno)
              </p>
              <IntlPricingForm value={intlCostPricing} readOnly />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarginPreviewTable({ costTable, finalMatrix }: { costTable: MDRMatrix; finalMatrix: MDRMatrix }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-ink-50 border-b border-ink-200">
            <th className="px-3 py-2 text-left font-semibold text-ink-600 w-12">Parc.</th>
            {BRANDS.map((b) => (
              <th key={b} colSpan={3} className="px-2 py-2 text-center font-semibold text-ink-700 border-l border-ink-100">{BRAND_LABELS[b]}</th>
            ))}
          </tr>
          <tr className="bg-ink-50/50 border-b border-ink-100">
            <th className="px-3 py-1" />
            {BRANDS.map((b) => (
              <Fragment key={b}>
                <th className="px-2 py-1 text-center font-normal text-red-500 border-l border-ink-100">Custo</th>
                <th className="px-2 py-1 text-center font-normal text-amber-600">+Mg</th>
                <th className="px-2 py-1 text-center font-semibold text-emerald-600">Final</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {INSTALLMENTS.map((inst) => (
            <tr key={inst} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
              <td className="px-3 py-1.5 font-semibold text-ink-700">{inst}x</td>
              {BRANDS.map((b) => {
                const bd = computeMarginBreakdown(costTable, finalMatrix, b as BrandName, inst as InstallmentNumber);
                return bd ? (
                  <Fragment key={b}>
                    <td className="px-2 py-1.5 text-center font-mono text-red-600 border-l border-ink-100">{bd.cost}%</td>
                    <td className="px-2 py-1.5 text-center font-mono text-amber-600">+{bd.margin}%</td>
                    <td className="px-2 py-1.5 text-center font-mono font-semibold text-emerald-700">{bd.final}%</td>
                  </Fragment>
                ) : (
                  <Fragment key={b}>
                    <td className="px-2 py-1.5 text-center text-ink-300 border-l border-ink-100">—</td>
                    <td className="px-2 py-1.5 text-center text-ink-300">—</td>
                    <td className="px-2 py-1.5 text-center text-ink-300">—</td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
