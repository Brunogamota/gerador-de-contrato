'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProposalData, ProposalDataSchema, DEFAULT_PROPOSAL_DATA } from '@/types/proposal';
import { MDRMatrix, IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { validateMatrix } from '@/lib/calculations/validation';
import { generateProposalNumber } from '@/lib/utils';
import { applyMargin, DEFAULT_MARGIN_CONFIG, MarginConfig } from '@/lib/pricing/margin';
import { ProposalInfoStep } from './steps/ProposalInfoStep';
import { CostStep } from './steps/CostStep';
import { ClientRatesStep } from './steps/ClientRatesStep';
import { PricingStep } from './steps/PricingStep';
import { ProposalPreviewStep } from './steps/ProposalPreviewStep';
import { FeesStep } from '@/components/contract/steps/FeesStep';
import { PROPOSAL_STEPS, getProposalSteps, ProposalStepId } from './wizard/steps';
import { ProposalStepIndicator } from './wizard/ProposalStepIndicator';
import { ProposalNavigation } from './wizard/ProposalNavigation';
import { useProposalSave } from './wizard/useProposalSave';
import { ContractData } from '@/types/contract';
import { UseFormReturn } from 'react-hook-form';

export interface ProposalInitialData {
  formData: ProposalData;
  mdrMatrix: MDRMatrix;
  costTable: MDRMatrix;
  clientRates: MDRMatrix;
  marginConfig: MarginConfig;
  intlCostPricing: IntlPricing;
  intlProposalPricing: IntlPricing;
  setupIntl: string;
  proposalNumber: string;
}

interface ProposalWizardProps {
  initialData?: ProposalInitialData;
  editId?: string;
  defaultTipoMercado?: 'brasil' | 'intl' | 'both';
}

export function ProposalWizard({ initialData, editId, defaultTipoMercado }: ProposalWizardProps = {}) {
  const [currentStep, setCurrentStep] = useState<ProposalStepId>('info');
  const [costTable, setCostTable] = useState<MDRMatrix>(() => initialData?.costTable ?? createEmptyMatrix());
  const [clientRates, setClientRates] = useState<MDRMatrix>(() => initialData?.clientRates ?? createEmptyMatrix());
  const [marginConfig, setMarginConfig] = useState<MarginConfig>(() => initialData?.marginConfig ?? DEFAULT_MARGIN_CONFIG);
  const [finalMatrix, setFinalMatrix] = useState<MDRMatrix>(() => initialData?.mdrMatrix ?? createEmptyMatrix());
  const [marketType, setMarketType] = useState<'brasil' | 'intl' | 'both'>('brasil');
  const [intlCostPricing, setIntlCostPricing] = useState<IntlPricing>(() => initialData?.intlCostPricing ?? DEFAULT_INTL_PRICING);
  const [intlProposalPricing, setIntlProposalPricing] = useState<IntlPricing>(() => initialData?.intlProposalPricing ?? DEFAULT_INTL_PRICING);
  const [setupIntl, setSetupIntl] = useState(() => initialData?.setupIntl ?? '0.00');
  const [proposalNumber] = useState(() => initialData?.proposalNumber ?? generateProposalNumber());
  const [profileBanner, setProfileBanner] = useState<string | null>(null);

  const form = useForm<ProposalData>({
    resolver: zodResolver(ProposalDataSchema),
    defaultValues: {
      ...(initialData?.formData ?? DEFAULT_PROPOSAL_DATA),
      ...(defaultTipoMercado && !initialData ? { tipoMercado: defaultTipoMercado } : {}),
    },
    mode: 'onBlur',
  });

  const tipoMercado = form.watch('tipoMercado') ?? 'brasil';
  const activeSteps = getProposalSteps(tipoMercado);

  // Auto-load CostProfile when MCC changes (called on goNext from info step)
  const loadCostProfile = useCallback(async (mcc: string) => {
    if (!mcc) return;
    try {
      const res = await fetch('/api/cost-profiles');
      if (!res.ok) return;
      const profiles: Array<{ name: string; mcc: string; mdrMatrix: string; isDefault: boolean }> = await res.json();

      const exact = profiles.find((p) => p.mcc === mcc);
      const fallback = profiles.find((p) => p.isDefault);
      const match = exact ?? fallback;

      if (match) {
        const parsed = JSON.parse(match.mdrMatrix) as MDRMatrix;
        setCostTable(parsed);
        setFinalMatrix(applyMargin(parsed, marginConfig));
        setProfileBanner(
          exact
            ? `Perfil carregado: "${match.name}" (MCC ${mcc})`
            : `Perfil padrão carregado: "${match.name}"`,
        );
        setTimeout(() => setProfileBanner(null), 4000);
      }
    } catch { /* ignore */ }
  }, [marginConfig]);

  const stepIndex = activeSteps.findIndex((s) => s.id === currentStep);
  const costValidation = validateMatrix(costTable);

  const handleMarginChange = useCallback((config: MarginConfig) => {
    setMarginConfig(config);
  }, []);

  const { handleSave, isSaving } = useProposalSave({
    getValues: form.getValues,
    mdrMatrix: finalMatrix,
    costTable,
    marginConfig,
    clientRates,
    proposalNumber,
    intlCostPricing,
    intlProposalPricing,
    setupIntl,
    editId,
  });

  async function goNext() {
    if (currentStep === 'info') {
      const valid = await form.trigger([
        'contratanteNome',
        'contratanteCnpj',
        'contratanteEndereco',
        'contratanteEmail',
        'contratanteTelefone',
        'validadeAte',
      ]);
      if (!valid) return;
      if (tipoMercado !== 'intl') {
        await loadCostProfile(form.getValues('mcc') ?? '');
      }
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < activeSteps.length) setCurrentStep(activeSteps[nextIdx].id);
  }

  function goBack() {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(activeSteps[prevIdx].id);
  }

  const contractForm = form as unknown as UseFormReturn<ContractData>;
  const mccValue = form.watch('mcc') ?? '';
  const clientNameValue = form.watch('contratanteNome') ?? '';
  const clientName = clientNameValue;
  const statusLabel = editId ? 'Rascunho' : 'Nova';

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-[#111111] border-b border-white/5 px-0 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 text-xs text-white/35">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hover:text-white/60 cursor-pointer" onClick={() => window.history.back()}>Voltar para propostas</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-white">Proposta Comercial</h1>
            <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-lg">{proposalNumber}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">{statusLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-white/70 hover:text-white hover:border-white/20 bg-white/5 transition-all"
            >
              {isSaving ? 'Salvando…' : 'Salvar rascunho'}
            </button>
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#f72662,#771339)', boxShadow: '0 0 16px rgba(247,38,98,0.35)' }}
            >
              <span style={{ color: '#ffd700' }}>⚡</span>
              {currentStep === 'pricing' ? 'Rodar engine' : 'Continuar'}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-4">
          <ProposalStepIndicator
            currentStep={currentStep}
            stepIndex={stepIndex}
            onGoToStep={setCurrentStep}
            steps={activeSteps}
          />
        </div>
      </div>

      {profileBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 mx-0 mt-4">
          <span>✓</span>
          {profileBanner}
        </div>
      )}

      <div className="flex-1 py-6">
        {currentStep === 'info' && <ProposalInfoStep form={form} />}
        {currentStep === 'cost' && (
          <CostStep
            matrix={costTable}
            onChange={(m) => {
              setCostTable(m);
              setFinalMatrix(applyMargin(m, marginConfig));
            }}
            intlCostPricing={intlCostPricing}
            onIntlCostChange={setIntlCostPricing}
            marketType={tipoMercado === 'intl' ? 'intl' : tipoMercado === 'both' ? 'both' : marketType}
            onMarketTypeChange={tipoMercado === 'intl' ? () => {} : setMarketType}
          />
        )}
        {currentStep === 'client-rates' && (
          <ClientRatesStep matrix={clientRates} onChange={setClientRates} />
        )}
        {currentStep === 'pricing' && (
          <PricingStep
            costTable={costTable}
            clientRates={clientRates}
            marginConfig={marginConfig}
            finalMatrix={finalMatrix}
            onMarginChange={handleMarginChange}
            onFinalMatrixChange={setFinalMatrix}
            mcc={mccValue}
            clientName={clientNameValue}
            intlCostPricing={intlCostPricing}
            intlProposalPricing={intlProposalPricing}
            onIntlProposalChange={setIntlProposalPricing}
            setupIntl={setupIntl}
            onSetupIntlChange={setSetupIntl}
            defaultMarket={tipoMercado === 'intl' ? 'intl' : undefined}
          />
        )}
        {currentStep === 'fees' && <FeesStep form={contractForm} />}
        {currentStep === 'preview' && (
          <ProposalPreviewStep
            proposalData={form.getValues()}
            mdrMatrix={finalMatrix}
            proposalNumber={proposalNumber}
            intlProposalPricing={intlProposalPricing}
            setupIntl={setupIntl}
            onSave={handleSave}
            isSaving={isSaving}
            saveLabel={editId ? 'Salvar Alterações' : undefined}
          />
        )}
        {/* Back button — shown on non-first steps */}
        {stepIndex > 0 && currentStep !== 'preview' && (
          <div className="mt-6 flex items-center gap-3">
            <button onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 bg-white/5 transition-all"
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
