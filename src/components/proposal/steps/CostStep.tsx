'use client';

import { useState } from 'react';
import { MDRMatrix, IntlPricing } from '@/types/pricing';
import { MDRGrid } from '@/components/mdr/MDRGrid';
import { PDFImportModal } from '@/components/mdr/PDFImportModal';
import { IntlPricingForm } from './IntlPricingForm';
import { validateMatrix } from '@/lib/calculations/validation';
import { cn } from '@/lib/utils';

interface CostStepProps {
  matrix: MDRMatrix;
  onChange: (matrix: MDRMatrix) => void;
  intlCostPricing: IntlPricing;
  onIntlCostChange: (v: IntlPricing) => void;
  marketType: 'brasil' | 'intl' | 'both';
  onMarketTypeChange: (v: 'brasil' | 'intl' | 'both') => void;
}

type Tab = 'brasil' | 'intl';

export function CostStep({
  matrix,
  onChange,
  intlCostPricing,
  onIntlCostChange,
  marketType,
  onMarketTypeChange,
}: CostStepProps) {
  const [tab, setTab] = useState<Tab>('brasil');
  const [showImport, setShowImport] = useState(false);
  const validation = validateMatrix(matrix);

  // Which content panel to render
  const showBrasil = marketType === 'brasil' || (marketType === 'both' && tab === 'brasil');
  const showIntl = marketType === 'intl' || (marketType === 'both' && tab === 'intl');

  return (
    <div className="flex flex-col gap-6">
      {/* Market type selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
        {([
          { id: 'brasil', label: '🇧🇷 Somente Brasil' },
          { id: 'intl',   label: '🌐 Somente Internacional' },
          { id: 'both',   label: 'Ambos' },
        ] as const).map((opt) => (
          <button
            key={opt.id}
            onClick={() => onMarketTypeChange(opt.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              marketType === opt.id
                ? 'bg-white text-ink-950 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-ink-950 mb-1">Custo da Adquirente</h2>
          <p className="text-sm text-ink-500">
            Taxas que a adquirente cobra de você — base para o cálculo da margem.
          </p>
        </div>

        {showBrasil && (
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand/30 bg-brand-50 text-brand text-sm font-semibold hover:bg-brand-100 hover:border-brand/50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
            Importar com IA
          </button>
        )}
      </div>

      {/* Tab selector — only visible when marketType is 'both' */}
      {marketType === 'both' && (
        <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
          {([
            { id: 'brasil', label: '🇧🇷 Brasil (MDR)' },
            { id: 'intl',   label: '🌐 Internacional' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-white text-ink-950 shadow-sm'
                  : 'text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" />
        </svg>
        <span><strong>Uso interno exclusivo</strong> — esta tabela nunca aparece no PDF nem é compartilhada com o cliente.</span>
      </div>

      {showBrasil && (
        <MDRGrid matrix={matrix} onChange={onChange} issues={validation.issues} />
      )}

      {showIntl && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Taxas cobradas pelo seu fornecedor internacional (ex: Stripe). Use como referência ao definir a proposta para o cliente.
          </p>
          <IntlPricingForm value={intlCostPricing} onChange={onIntlCostChange} />
        </div>
      )}

      {showImport && (
        <PDFImportModal
          currentMatrix={matrix}
          onConfirm={(m) => { onChange(m); setShowImport(false); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
