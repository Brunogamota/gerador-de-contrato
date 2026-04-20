'use client';

import { useState, Fragment } from 'react';
import { MDRMatrix, BRANDS, BRAND_LABELS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { MarginConfig } from '@/lib/pricing/margin';
import { computeMarginBreakdown, applyMargin } from '@/lib/pricing/margin';
import { updateMatrixEntry } from '@/lib/calculations/mdr';
import { cn } from '@/lib/utils';

type PricingMode = 'margin' | 'manual' | 'ai';

interface PricingStepProps {
  costTable: MDRMatrix;
  clientRates: MDRMatrix;
  marginConfig: MarginConfig;
  finalMatrix: MDRMatrix;
  onMarginChange: (config: MarginConfig) => void;
  onFinalMatrixChange: (matrix: MDRMatrix) => void;
  mcc?: string;
  clientName?: string;
}

export function PricingStep({
  costTable,
  clientRates,
  marginConfig,
  finalMatrix,
  onMarginChange,
  onFinalMatrixChange,
  mcc,
  clientName,
}: PricingStepProps) {
  const [mode, setMode] = useState<PricingMode>('margin');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRationale, setAiRationale] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<MDRMatrix | null>(null);

  async function handleAiSuggest() {
    setAiLoading(true);
    setAiRationale('');
    setAiSuggestion(null);
    try {
      const res = await fetch('/api/proposals/suggest-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costTable, clientRates, mcc }),
      });
      if (!res.ok) throw new Error('AI suggestion failed');
      const { matrix, rationale } = await res.json() as { matrix: MDRMatrix; rationale: string };
      setAiSuggestion(matrix);
      setAiRationale(rationale);
    } catch {
      alert('Erro ao gerar sugestão. Verifique a OPENAI_API_KEY e tente novamente.');
    } finally {
      setAiLoading(false);
    }
  }

  function acceptAiSuggestion() {
    if (!aiSuggestion) return;
    onFinalMatrixChange(aiSuggestion);
    setAiSuggestion(null);
    setMode('manual');
  }

  function updateCell(brand: BrandName, inst: InstallmentNumber, field: 'mdrBase' | 'anticipationRate', value: string) {
    const updated = updateMatrixEntry(finalMatrix, brand, inst, field, value);
    onFinalMatrixChange(updated);
  }

  // Sync margin-derived table when switching back to margin mode
  function switchMode(m: PricingMode) {
    if (m === 'margin') {
      onFinalMatrixChange(applyMargin(costTable, marginConfig));
    }
    setMode(m);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-950 mb-1">Precificação Final</h2>
        <p className="text-sm text-ink-500">
          Defina as taxas que aparecerão na proposta. Escolha o método abaixo.
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        <span><strong>Uso interno:</strong> custos e margens nunca aparecem no PDF.</span>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'margin', label: 'Margem global', icon: '%' },
          { id: 'manual', label: 'Edição célula a célula', icon: '✏' },
          { id: 'ai',     label: 'Sugestão IA', icon: '✦' },
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

      {/* ── MODE: Margem global ── */}
      {mode === 'margin' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-5 p-5 rounded-2xl border border-ink-200 bg-ink-50">
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Tipo</label>
              <div className="flex gap-2">
                {(['percent', 'fixed'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const newCfg = { ...marginConfig, type: t };
                      onMarginChange(newCfg);
                      onFinalMatrixChange(applyMargin(costTable, newCfg));
                    }}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                      marginConfig.type === t
                        ? 'bg-brand text-white border-brand shadow-sm'
                        : 'bg-white text-ink-700 border-ink-200 hover:border-brand/50',
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
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={marginConfig.value}
                  onChange={(e) => {
                    const newCfg = { ...marginConfig, value: e.target.value };
                    onMarginChange(newCfg);
                    onFinalMatrixChange(applyMargin(costTable, newCfg));
                  }}
                  className="pl-7 pr-4 py-2 rounded-xl border border-ink-200 bg-white text-sm font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand w-36"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <MarginPreviewTable costTable={costTable} finalMatrix={finalMatrix} />
        </div>
      )}

      {/* ── MODE: Manual ── */}
      {mode === 'manual' && (
        <div className="overflow-x-auto rounded-xl border border-ink-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-ink-50 border-b border-ink-200">
                <th className="px-3 py-2 text-left font-semibold text-ink-600 w-12">Parc.</th>
                {BRANDS.map((b) => (
                  <th key={b} colSpan={2} className="px-2 py-2 text-center font-semibold text-ink-700 border-l border-ink-100">
                    {BRAND_LABELS[b]}
                  </th>
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
                          <input
                            type="text"
                            value={entry?.mdrBase ?? ''}
                            onChange={(e) => updateCell(b as BrandName, inst as InstallmentNumber, 'mdrBase', e.target.value)}
                            className={cn(
                              'w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand',
                              entry?.mdrBase
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-ink-200 bg-white text-ink-500',
                            )}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry?.anticipationRate ?? ''}
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

      {/* ── MODE: IA ── */}
      {mode === 'ai' && (
        <div className="flex flex-col gap-5">
          <div className="p-5 rounded-2xl border border-ink-200 bg-ink-50 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                <span className="text-brand font-bold text-lg">✦</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900 mb-1">Sugestão de pricing por IA</p>
                <p className="text-xs text-ink-500 leading-relaxed">
                  A IA analisa seu custo, as taxas atuais do cliente e o MCC para sugerir um pricing
                  competitivo com margem saudável. Você pode aceitar ou ajustar manualmente.
                </p>
                {mcc && (
                  <p className="text-xs text-ink-400 mt-1">
                    MCC: <span className="font-mono text-ink-600">{mcc}</span>{' '}
                    {clientName && `· ${clientName}`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading}
              className={cn(
                'self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                aiLoading
                  ? 'bg-ink-400 cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-700 shadow-sm',
              )}
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Analisando…
                </>
              ) : (
                <>✦ Gerar sugestão de pricing</>
              )}
            </button>
          </div>

          {aiSuggestion && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col gap-4">
              {aiRationale && (
                <div className="flex items-start gap-3">
                  <span className="text-emerald-500 text-lg flex-shrink-0">💡</span>
                  <p className="text-sm text-emerald-800 leading-relaxed">{aiRationale}</p>
                </div>
              )}
              <MarginPreviewTable costTable={costTable} finalMatrix={aiSuggestion} />
              <div className="flex gap-3">
                <button
                  onClick={acceptAiSuggestion}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                >
                  ✓ Aceitar sugestão
                </button>
                <button
                  onClick={handleAiSuggest}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 transition-all"
                >
                  ↺ Gerar nova sugestão
                </button>
              </div>
            </div>
          )}

          {/* Show current table below */}
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Tabela atual</p>
            <MarginPreviewTable costTable={costTable} finalMatrix={finalMatrix} />
          </div>
        </div>
      )}
    </div>
  );
}

function MarginPreviewTable({
  costTable,
  finalMatrix,
}: {
  costTable: MDRMatrix;
  finalMatrix: MDRMatrix;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-ink-50 border-b border-ink-200">
            <th className="px-3 py-2 text-left font-semibold text-ink-600 w-12">Parc.</th>
            {BRANDS.map((b) => (
              <th key={b} colSpan={3} className="px-2 py-2 text-center font-semibold text-ink-700 border-l border-ink-100">
                {BRAND_LABELS[b]}
              </th>
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
                const bd = computeMarginBreakdown(
                  costTable,
                  finalMatrix,
                  b as BrandName,
                  inst as InstallmentNumber,
                );
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
