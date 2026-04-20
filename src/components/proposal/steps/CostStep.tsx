'use client';

import { useState, useEffect, useRef } from 'react';
import { MDRMatrix, IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';
import { MDRGrid } from '@/components/mdr/MDRGrid';
import { PDFImportModal } from '@/components/mdr/PDFImportModal';
import { IntlPricingForm } from './IntlPricingForm';
import { validateMatrix } from '@/lib/calculations/validation';
import { cn } from '@/lib/utils';

interface CostProfile {
  id: string;
  name: string;
  mcc: string;
  profileType?: string;
  mdrMatrix: string;
  intlCostPricing: string;
  isDefault: boolean;
}

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
  matrix, onChange, intlCostPricing, onIntlCostChange, marketType, onMarketTypeChange,
}: CostStepProps) {
  const [tab, setTab] = useState<Tab>('brasil');
  const [showImport, setShowImport] = useState(false);
  const [profiles, setProfiles] = useState<CostProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loadedProfileName, setLoadedProfileName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const validation = validateMatrix(matrix);

  const showBrasil = marketType === 'brasil' || (marketType === 'both' && tab === 'brasil');
  const showIntl   = marketType === 'intl'   || (marketType === 'both' && tab === 'intl');

  // Fetch profiles once on mount
  useEffect(() => {
    setLoadingProfiles(true);
    fetch('/api/cost-profiles')
      .then((r) => r.ok ? r.json() : [])
      .then((data: CostProfile[]) => setProfiles(data))
      .catch(() => {})
      .finally(() => setLoadingProfiles(false));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Check if intl form already has data
  const intlHasData = Object.values(intlCostPricing).some((v) => v && v !== '' && v !== '0.00');

  const intlProfiles = profiles.filter((p) => p.profileType === 'intl');
  const brasilProfiles = profiles.filter((p) => p.profileType !== 'intl');

  function applyIntlProfile(p: CostProfile) {
    try {
      const parsed = JSON.parse(p.intlCostPricing || '{}') as IntlPricing;
      const merged = { ...DEFAULT_INTL_PRICING, ...parsed };
      onIntlCostChange(merged);
      setLoadedProfileName(p.name);
      setProfileMenuOpen(false);
      setTimeout(() => setLoadedProfileName(null), 3000);
    } catch { /* ignore */ }
  }

  function applyBrasilProfile(p: CostProfile) {
    try {
      const parsed = JSON.parse(p.mdrMatrix || '{}') as MDRMatrix;
      onChange(parsed);
      setLoadedProfileName(p.name);
      setProfileMenuOpen(false);
      setTimeout(() => setLoadedProfileName(null), 3000);
    } catch { /* ignore */ }
  }

  const activeProfiles = showIntl ? intlProfiles : brasilProfiles;

  return (
    <div className="flex flex-col gap-6">

      {/* Market type selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
        {([
          { id: 'brasil', label: '🇧🇷 Somente Brasil' },
          { id: 'intl',   label: '🌐 Somente Internacional' },
          { id: 'both',   label: 'Ambos' },
        ] as const).map((opt) => (
          <button key={opt.id} onClick={() => onMarketTypeChange(opt.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              marketType === opt.id ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-ink-950 tracking-tight mb-0.5">Custo da Adquirente</h2>
          <p className="text-sm text-ink-400">Taxas que a adquirente cobra de você — base para o cálculo da margem.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Profile loader dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileMenuOpen((v) => !v)}
              disabled={loadingProfiles || activeProfiles.length === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
                'border-ink-300 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50',
                (loadingProfiles || activeProfiles.length === 0) && 'opacity-40 cursor-not-allowed',
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-4-4m4 4l-4 4" />
              </svg>
              {loadingProfiles ? 'Carregando…' : 'Carregar perfil'}
              <svg className={cn('w-3.5 h-3.5 transition-transform', profileMenuOpen && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileMenuOpen && activeProfiles.length > 0 && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white border border-ink-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-ink-100">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                    {showIntl ? 'Perfis Internacionais (Stripe)' : 'Perfis Brasil (MDR)'}
                  </p>
                </div>
                {activeProfiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => showIntl ? applyIntlProfile(p) : applyBrasilProfile(p)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-ink-800 hover:bg-ink-50 transition-colors text-left"
                  >
                    <span className="font-medium">{p.name}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {p.isDefault && (
                        <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">padrão</span>
                      )}
                      {p.mcc && (
                        <span className="text-xs text-ink-400 font-mono">{p.mcc}</span>
                      )}
                    </div>
                  </button>
                ))}
                {activeProfiles.length === 0 && (
                  <p className="px-3 py-3 text-sm text-ink-400">
                    Nenhum perfil {showIntl ? 'internacional' : 'Brasil'} cadastrado.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Brasil: IA import */}
          {showBrasil && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand/30 bg-brand/5 text-brand text-sm font-semibold hover:bg-brand/10 hover:border-brand/50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
              Importar com IA
            </button>
          )}
        </div>
      </div>

      {/* Success toast */}
      {loadedProfileName && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Perfil <strong>{loadedProfileName}</strong> carregado com sucesso.
        </div>
      )}

      {/* Tab selector (Ambos only) */}
      {marketType === 'both' && (
        <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
          {([
            { id: 'brasil', label: '🇧🇷 Brasil (MDR)' },
            { id: 'intl',   label: '🌐 Internacional' },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-800',
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

      {showBrasil && <MDRGrid matrix={matrix} onChange={onChange} issues={validation.issues} />}

      {showIntl && (
        <div className="flex flex-col gap-4">
          {!intlHasData && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Nenhum custo carregado. Use <strong className="mx-1">Carregar perfil</strong> acima para puxar seus custos Stripe.
            </div>
          )}
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
