'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { PROPOSAL_STEPS, ProposalStepId } from './wizard/steps';
import { ProposalStepIndicator } from './wizard/ProposalStepIndicator';
import { ProposalNavigation } from './wizard/ProposalNavigation';
import { useProposalSave } from './wizard/useProposalSave';
import { ContractData } from '@/types/contract';
import { UseFormReturn } from 'react-hook-form';

// ── Draft persistence ────────────────────────────────────────────────────────

const DRAFT_KEY = 'proposal-wizard-draft';

function loadDraft(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearProposalDraft() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

// ────────────────────────────────────────────────────────────────────────────

export function ProposalWizard() {
  const draft = useRef(loadDraft()).current;

  const [currentStep, setCurrentStep] = useState<ProposalStepId>((draft?.currentStep as ProposalStepId) ?? 'info');
  const [costTable, setCostTable] = useState<MDRMatrix>((draft?.costTable as MDRMatrix) ?? createEmptyMatrix());
  const [clientRates, setClientRates] = useState<MDRMatrix>((draft?.clientRates as MDRMatrix) ?? createEmptyMatrix());
  const [marginConfig, setMarginConfig] = useState<MarginConfig>((draft?.marginConfig as MarginConfig) ?? DEFAULT_MARGIN_CONFIG);
  const [finalMatrix, setFinalMatrix] = useState<MDRMatrix>((draft?.finalMatrix as MDRMatrix) ?? createEmptyMatrix());
  const [intlCostPricing, setIntlCostPricing] = useState<IntlPricing>((draft?.intlCostPricing as IntlPricing) ?? DEFAULT_INTL_PRICING);
  const [intlProposalPricing, setIntlProposalPricing] = useState<IntlPricing>((draft?.intlProposalPricing as IntlPricing) ?? DEFAULT_INTL_PRICING);
  const [setupIntl, setSetupIntl] = useState<string>((draft?.setupIntl as string) ?? '0.00');
  const [proposalNumber] = useState<string>((draft?.proposalNumber as string) ?? generateProposalNumber());
  const [profileBanner, setProfileBanner] = useState<string | null>(null);
  const [marketType, setMarketType] = useState<'brasil' | 'intl' | 'both'>((draft?.marketType as 'brasil' | 'intl' | 'both') ?? 'brasil');
  const [hasDraftBanner, setHasDraftBanner] = useState(!!draft);

  const form = useForm<ProposalData>({
    resolver: zodResolver(ProposalDataSchema),
    defaultValues: (draft?.formValues as ProposalData) ?? DEFAULT_PROPOSAL_DATA,
    mode: 'onBlur',
  });

  // Auto-save draft on any state change
  const formValues = form.watch();
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        currentStep, formValues, costTable, clientRates, marginConfig,
        finalMatrix, intlCostPricing, intlProposalPricing, setupIntl, marketType, proposalNumber,
      }));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, costTable, clientRates, marginConfig, finalMatrix, intlCostPricing, intlProposalPricing, setupIntl, marketType, JSON.stringify(formValues)]);

  // Auto-load CostProfile when MCC changes (called on goNext from info step)
  const loadCostProfile = useCallback(async (mcc: string) => {
    try {
      const res = await fetch('/api/cost-profiles');
      if (!res.ok) return;
      const profiles: Array<{
        name: string; mcc: string; mdrMatrix: string; isDefault: boolean;
        intlCostPricing?: string; profileType?: string;
      }> = await res.json();

      if (!profiles.length) return;

      const hasMcc = !!mcc;

      // ── MDR (Brasil) profile: exact MCC → default brasil → any default ──
      const mdrProfile =
        (hasMcc && profiles.find((p) => p.mcc === mcc && p.profileType !== 'intl')) ??
        profiles.find((p) => p.isDefault && p.profileType !== 'intl') ??
        profiles.find((p) => p.isDefault) ??
        profiles.find((p) => p.profileType !== 'intl');

      // ── Intl (Stripe) profile: exact MCC intl → default intl → any intl ──
      const intlProfile =
        (hasMcc && profiles.find((p) => p.mcc === mcc && p.profileType === 'intl')) ??
        profiles.find((p) => p.isDefault && p.profileType === 'intl') ??
        profiles.find((p) => p.profileType === 'intl');

      const loadedNames: string[] = [];

      if (mdrProfile) {
        try {
          const parsed = JSON.parse(mdrProfile.mdrMatrix) as MDRMatrix;
          setCostTable(parsed);
          setFinalMatrix(applyMargin(parsed, marginConfig));
          loadedNames.push(mdrProfile.name);
        } catch { /* ignore */ }
      }

      if (intlProfile) {
        try {
          const intlParsed = JSON.parse(intlProfile.intlCostPricing ?? '{}') as IntlPricing;
          const hasData = Object.values(intlParsed).some((v) => v && v !== '' && v !== '0.00');
          if (hasData) {
            setIntlCostPricing(intlParsed);
            if (!loadedNames.includes(intlProfile.name)) loadedNames.push(intlProfile.name);
          }
        } catch { /* ignore */ }
      }

      if (loadedNames.length) {
        setProfileBanner(`Perfis carregados: ${loadedNames.join(' + ')}`);
        setTimeout(() => setProfileBanner(null), 5000);
      }
    } catch { /* ignore */ }
  }, [marginConfig]);

  const stepIndex = PROPOSAL_STEPS.findIndex((s) => s.id === currentStep);
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
    onSuccess: clearProposalDraft,
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
      // Load cost profile (by MCC or default — always try to load)
      await loadCostProfile(form.getValues('mcc') ?? '');
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < PROPOSAL_STEPS.length) setCurrentStep(PROPOSAL_STEPS[nextIdx].id);
  }

  function goBack() {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(PROPOSAL_STEPS[prevIdx].id);
  }

  const contractForm = form as unknown as UseFormReturn<ContractData>;
  const mccValue = form.watch('mcc') ?? '';
  const clientNameValue = form.watch('contratanteNome') ?? '';

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-12">
      <ProposalStepIndicator
        currentStep={currentStep}
        stepIndex={stepIndex}
        onGoToStep={setCurrentStep}
      />

      {hasDraftBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rascunho recuperado — retomando de onde você parou.
          </span>
          <button
            onClick={() => {
              clearProposalDraft();
              window.location.reload();
            }}
            className="text-xs font-medium text-amber-600 hover:text-amber-800 underline whitespace-nowrap"
          >
            Começar do zero
          </button>
        </div>
      )}

      {profileBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          <span className="text-emerald-500">✓</span>
          {profileBanner}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
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
            marketType={marketType}
            onMarketTypeChange={setMarketType}
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
          />
        )}
      </div>

      {currentStep !== 'preview' && (
        <ProposalNavigation
          currentStep={currentStep}
          stepIndex={stepIndex}
          mdrIsValid={costValidation.isValid}
          mdrCanGenerate={costValidation.canGenerateContract}
          onBack={goBack}
          onNext={goNext}
        />
      )}
    </div>
  );
}
