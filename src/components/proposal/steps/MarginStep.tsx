'use client';

import { Fragment } from 'react';
import { MDRMatrix, BRANDS, BRAND_LABELS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { MarginConfig } from '@/lib/pricing/margin';
import { computeMarginBreakdown } from '@/lib/pricing/margin';
import { cn } from '@/lib/utils';

interface MarginStepProps {
  costTable: MDRMatrix;
  marginConfig: MarginConfig;
  finalMatrix: MDRMatrix;
  onMarginChange: (config: MarginConfig) => void;
}

export function MarginStep({ costTable, marginConfig, finalMatrix, onMarginChange }: MarginStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-950 mb-1">Margem Comercial</h2>
        <p className="text-sm text-ink-500">
          Configure a margem sobre o custo da adquirente. Somente a tabela final é enviada ao cliente.
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        <span><strong>Uso interno exclusivo</strong> — custo e margem nunca aparecem no PDF da proposta.</span>
      </div>

      {/* Margin config controls */}
      <div className="flex flex-wrap items-end gap-5 p-5 rounded-2xl border border-ink-200 bg-ink-50">
        <div>
          <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Tipo de margem</label>
          <div className="flex gap-2">
            {(['percent', 'fixed'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onMarginChange({ ...marginConfig, type: t })}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                  marginConfig.type === t
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-white text-ink-700 border-ink-200 hover:border-brand/50'
                )}
              >
                {t === 'percent' ? 'Percentual (%)' : 'Fixo (pp)'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">
            {marginConfig.type === 'percent' ? 'Margem (% do custo)' : 'Margem (pontos percentuais)'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500 pointer-events-none">
              +
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={marginConfig.value}
              onChange={(e) => onMarginChange({ ...marginConfig, value: e.target.value })}
              className="pl-7 pr-4 py-2 rounded-xl border border-ink-200 bg-white text-sm font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand w-36"
            />
          </div>
        </div>

        <div className="text-sm text-ink-500">
          {marginConfig.type === 'percent'
            ? 'Fórmula: final = custo × (1 + margem/100)'
            : 'Fórmula: final = custo + margem (pp)'}
        </div>
      </div>

      {/* Live breakdown table */}
      <div>
        <h3 className="text-sm font-semibold text-ink-700 mb-3">Custo → Margem → Taxa Final</h3>
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
                    <th className="px-2 py-1 text-center font-normal text-emerald-600 font-semibold">Final</th>
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
      </div>
    </div>
  );
}
