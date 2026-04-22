'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  buildFeesViewModel,
  applyBulkOverrides,
  PRICING_PROFILES,
  COST_CENTERS,
} from '@/lib/fees/pricingViewModel';
import type { OverrideMap, PricingBrand, TableInstallment } from '@/lib/fees/pricingViewModel';
import { FeesPricingTable } from '@/components/fees/FeesPricingTable';
import { StrategySummaryCards } from '@/components/fees/StrategySummaryCards';
import { PricingCopilot } from '@/components/fees/PricingCopilot';
import { RegrasTab } from '@/components/fees/tabs/RegrasTab';
import { SimuladorTab } from '@/components/fees/tabs/SimuladorTab';
import { HistoricoTab } from '@/components/fees/tabs/HistoricoTab';

type Tab = 'tabela' | 'regras' | 'simulador' | 'historico';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tabela',    label: 'Tabela de Taxas' },
  { id: 'regras',    label: 'Regras e Estratégias' },
  { id: 'simulador', label: 'Simulador de Impacto' },
  { id: 'historico', label: 'Histórico de Alterações' },
];

interface CopilotChange {
  brand: PricingBrand;
  inst: TableInstallment;
  oldRate: number;
  newRate: number;
  reason: string;
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-white/[0.09] bg-[#111113] text-sm text-white focus:outline-none focus:border-white/20 transition-colors cursor-pointer min-w-[180px]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default function TaxasEtarifasPage() {
  const [profileId, setProfileId]       = useState('enterprise');
  const [costCenterId, setCostCenterId] = useState('dock');
  const [overrides, setOverrides]       = useState<OverrideMap>({});
  const [activeTab, setActiveTab]       = useState<Tab>('tabela');
  const [showCosts, setShowCosts]       = useState(false);
  const [saveState, setSaveState]       = useState<'idle' | 'saved'>('idle');

  const vm = useMemo(
    () => buildFeesViewModel(profileId, costCenterId, overrides),
    [profileId, costCenterId, overrides],
  );

  const overrideCount = Object.values(overrides).reduce(
    (sum, b) => sum + (b ? Object.keys(b).length : 0),
    0,
  );
  const hasOverrides = overrideCount > 0;

  function handleApplyCopilot(changes: CopilotChange[]) {
    setOverrides((prev) =>
      applyBulkOverrides(
        prev,
        changes.map((c) => ({ brand: c.brand, inst: c.inst, rate: c.newRate })),
      ),
    );
  }

  function handleSave() {
    try {
      localStorage.setItem(`fees-overrides-${profileId}`, JSON.stringify(overrides));
    } catch {}
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2000);
  }

  function handleReset() {
    setOverrides({});
    try { localStorage.removeItem(`fees-overrides-${profileId}`); } catch {}
  }

  const profileOptions = PRICING_PROFILES.map((p) => ({ value: p.id, label: p.name }));
  const ccOptions      = COST_CENTERS.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="-mx-8 -my-8 flex min-h-screen bg-[#0B0B0C]">

      {/* ── Left: main content ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-auto">

        {/* Page header */}
        <div className="px-8 pt-8 pb-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Taxas e Tarifas</h1>
            <p className="text-sm text-white/40 mt-1">Configure e gerencie suas taxas aplicadas aos clientes.</p>
          </div>

          {/* Context selectors */}
          <div className="flex items-end gap-4 flex-wrap pb-6 border-b border-white/[0.05]">
            <div className="flex items-end gap-2.5">
              <SelectField
                label="Perfil de Pricing"
                value={profileId}
                onChange={(v) => { setProfileId(v); setOverrides({}); }}
                options={profileOptions}
              />
              {vm.profile.badge && (
                <span className="mb-[9px] text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 whitespace-nowrap">
                  {vm.profile.badge}
                </span>
              )}
            </div>

            <div className="flex items-end gap-2.5">
              <SelectField
                label="Centro de Custo"
                value={costCenterId}
                onChange={setCostCenterId}
                options={ccOptions}
              />
              <span className="mb-[9px] text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Ativo</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Cliente (opcional)</label>
              <select className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-white/[0.09] bg-[#111113] text-sm text-white/40 focus:outline-none transition-colors cursor-pointer w-[200px]">
                <option>Selecione um cliente</option>
              </select>
            </div>

            <div className="ml-auto self-end">
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-white/[0.09] text-white/50 hover:text-white hover:border-white/20 bg-white/[0.02] transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Comparar perfis
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-3.5 text-sm font-medium transition-all border-b-2',
                  activeTab === tab.id
                    ? 'text-brand border-brand'
                    : 'text-white/40 border-transparent hover:text-white/65',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 px-8 py-6 flex flex-col gap-6">

          {activeTab === 'tabela' && (
            <>
              {/* Table card */}
              <div className="bg-[#111113] rounded-2xl border border-white/[0.06]">

                {/* Table toolbar */}
                <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">Tabela de Taxas</h2>
                      <svg className="w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs text-white/35 mt-0.5">
                      Valores baseados no perfil{' '}
                      <span className="text-white/55">{vm.profile.name}</span>{' '}
                      e centro de custo{' '}
                      <span className="text-white/55">{vm.costCenter.name}</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowCosts((v) => !v)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        showCosts
                          ? 'bg-white/[0.08] text-white border-white/20'
                          : 'border-white/[0.08] text-white/45 hover:text-white hover:border-white/20',
                      )}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver custos
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] text-white/45 hover:text-white hover:border-white/20 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exportar
                    </button>

                    {hasOverrides && (
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] text-white/45 hover:text-red-400 hover:border-red-500/30 transition-all"
                      >
                        Resetar ({overrideCount})
                      </button>
                    )}

                    <button
                      onClick={handleSave}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95',
                        saveState === 'saved'
                          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : '',
                      )}
                      style={saveState !== 'saved' ? {
                        background: 'linear-gradient(135deg,#f72662,#771339)',
                        boxShadow: '0 0 14px rgba(247,38,98,0.25)',
                      } : undefined}
                    >
                      {saveState === 'saved' ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Salvo!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          Salvar alterações
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Override notice */}
                {hasOverrides && (
                  <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl flex items-center gap-2 border border-brand/20 bg-brand/[0.04]">
                    <svg className="w-3.5 h-3.5 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-xs text-white/50">
                      <span className="text-brand font-semibold">
                        {overrideCount} override{overrideCount !== 1 ? 's' : ''} ativo{overrideCount !== 1 ? 's' : ''}
                      </span>
                      {' '}— células personalizadas localmente. O Pricing Engine base não é alterado.
                    </span>
                  </div>
                )}

                <div className="border-t border-white/[0.06]">
                  <FeesPricingTable
                    table={vm.table}
                    overrides={overrides}
                    onOverrideChange={setOverrides}
                    showCosts={showCosts}
                  />
                </div>

                {/* Legend */}
                <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-4 flex-wrap">
                  <p className="text-[10px] text-white/20">Clique em uma célula para editar · Enter para confirmar · Esc para cancelar</p>
                  <div className="flex items-center gap-4 ml-auto">
                    {[
                      { color: 'bg-emerald-400', label: 'Margem saudável (≥0,35%)' },
                      { color: 'bg-amber-400',   label: 'Atenção (0,15–0,35%)' },
                      { color: 'bg-red-400',     label: 'Prejuízo (<0,15%)' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-[10px] text-white/30">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary cards */}
              <div>
                <h2 className="text-sm font-semibold text-white mb-4">Resumo da Estratégia</h2>
                <StrategySummaryCards summary={vm.summary} />
              </div>
            </>
          )}

          {activeTab === 'regras' && (
            <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6">
              <RegrasTab />
            </div>
          )}

          {activeTab === 'simulador' && (
            <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6">
              <SimuladorTab table={vm.table} />
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6">
              <HistoricoTab />
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Pricing Copilot ── */}
      <PricingCopilot
        overrides={overrides}
        onApplySuggestion={(changes) => handleApplyCopilot(changes as CopilotChange[])}
      />
    </div>
  );
}
