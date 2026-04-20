'use client';

import { useState, useMemo } from 'react';
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
import { MarginStep } from './steps/MarginStep';
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
  const [marginConfig, setMarginConfig] = useState<MarginConfig>(DEFAULT_MARGIN_CONFIG);
  const [proposalNumber] = useState(generateProposalNumber);

  const form = useForm<ProposalData>({
    resolver: zodResolver(ProposalDataSchema),
    defaultValues: DEFAULT_PROPOSAL_DATA,
    mode: 'onBlur',
  });

  // finalMatrix is always derived from costTable + marginConfig
  const finalMatrix = useMemo(
    () => applyMargin(costTable, marginConfig),
    [costTable, marginConfig],
  );

  const stepIndex = PROPOSAL_STEPS.findIndex((s) => s.id === currentStep);
  const costValidation = validateMatrix(costTable);

  const { handleSave, isSaving } = useProposalSave({
    getValues: form.getValues,
    mdrMatrix: finalMatrix,
    costTable,
    marginConfig,
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
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < PROPOSAL_STEPS.length) setCurrentStep(PROPOSAL_STEPS[nextIdx].id);
  }

  function goBack() {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(PROPOSAL_STEPS[prevIdx].id);
  }

  const contractForm = form as unknown as UseFormReturn<ContractData>;

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-12">
      <ProposalStepIndicator
        currentStep={currentStep}
        stepIndex={stepIndex}
        onGoToStep={setCurrentStep}
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 md:p-8">
        {currentStep === 'info' && <ProposalInfoStep form={form} />}
        {currentStep === 'cost' && (
          <CostStep matrix={costTable} onChange={setCostTable} />
        )}
        {currentStep === 'margin' && (
          <MarginStep
            costTable={costTable}
            marginConfig={marginConfig}
            finalMatrix={finalMatrix}
            onMarginChange={setMarginConfig}
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
