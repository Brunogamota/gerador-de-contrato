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

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-12">
      <ProposalStepIndicator
        currentStep={currentStep}
        stepIndex={stepIndex}
        onGoToStep={setCurrentStep}
        steps={activeSteps}
      />

      {profileBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 animate-fade-in">
          <span className="text-emerald-500">✓</span>
          {profileBanner}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 md:p-8">
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
