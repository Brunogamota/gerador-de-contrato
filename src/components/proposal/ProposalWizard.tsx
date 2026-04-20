'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProposalData, ProposalDataSchema, DEFAULT_PROPOSAL_DATA } from '@/types/proposal';
import { MDRMatrix } from '@/types/pricing';
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

export function ProposalWizard() {
  const [currentStep, setCurrentStep] = useState<ProposalStepId>('info');
  const [costTable, setCostTable] = useState<MDRMatrix>(createEmptyMatrix);
  const [clientRates, setClientRates] = useState<MDRMatrix>(createEmptyMatrix);
  const [marginConfig, setMarginConfig] = useState<MarginConfig>(DEFAULT_MARGIN_CONFIG);
  const [finalMatrix, setFinalMatrix] = useState<MDRMatrix>(createEmptyMatrix);
  const [proposalNumber] = useState(generateProposalNumber);
  const [profileBanner, setProfileBanner] = useState<string | null>(null);

  const form = useForm<ProposalData>({
    resolver: zodResolver(ProposalDataSchema),
    defaultValues: DEFAULT_PROPOSAL_DATA,
    mode: 'onBlur',
  });

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

  const stepIndex = PROPOSAL_STEPS.findIndex((s) => s.id === currentStep);
  const costValidation = validateMatrix(costTable);

  // When margin config changes, keep final in sync (if not overridden manually)
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

      {profileBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 animate-fade-in">
          <span className="text-emerald-500">✓</span>
          {profileBanner}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 md:p-8">
        {currentStep === 'info' && <ProposalInfoStep form={form} />}
        {currentStep === 'cost' && (
          <CostStep matrix={costTable} onChange={(m) => {
            setCostTable(m);
            setFinalMatrix(applyMargin(m, marginConfig));
          }} />
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
          />
        )}
        {currentStep === 'fees' && <FeesStep form={contractForm} />}
        {currentStep === 'preview' && (
          <ProposalPreviewStep
            proposalData={form.getValues()}
            mdrMatrix={finalMatrix}
            proposalNumber={proposalNumber}
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
