'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContractData, ContractDataSchema, DEFAULT_CONTRACT_DATA } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { validateMatrix } from '@/lib/calculations/validation';
import { generateContractNumber } from '@/lib/utils';
import { ClientInfoStep } from './steps/ClientInfoStep';
import { MDRStep } from './steps/MDRStep';
import { FeesStep } from './steps/FeesStep';
import { PreviewStep } from './steps/PreviewStep';
import { STEPS, StepId } from './wizard/steps';
import { WizardStepIndicator } from './wizard/WizardStepIndicator';
import { WizardNavigation } from './wizard/WizardNavigation';
import { useContractSave } from './wizard/useContractSave';

export function ContractWizard() {
  const [currentStep, setCurrentStep] = useState<StepId>('client');
  const [mdrMatrix, setMdrMatrix] = useState<MDRMatrix>(createEmptyMatrix);
  const [contractNumber] = useState(generateContractNumber);

  const form = useForm<ContractData>({
    resolver: zodResolver(ContractDataSchema),
    defaultValues: DEFAULT_CONTRACT_DATA,
    mode: 'onBlur',
  });

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const mdrValidation = validateMatrix(mdrMatrix);

  const { handleSave, isSaving } = useContractSave({
    getValues: form.getValues,
    mdrMatrix,
    contractNumber,
  });

  async function goNext() {
    if (currentStep === 'client') {
      const valid = await form.trigger([
        'contratanteNome',
        'contratanteCnpj',
        'contratanteEndereco',
        'contratanteEmail',
        'contratanteTelefone',
        'dataInicio',
      ]);
      if (!valid) return;
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx].id);
  }

  function goBack() {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx].id);
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-12">
      <WizardStepIndicator
        currentStep={currentStep}
        stepIndex={stepIndex}
        onGoToStep={setCurrentStep}
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 md:p-8">
        {currentStep === 'client' && <ClientInfoStep form={form} />}
        {currentStep === 'mdr' && (
          <MDRStep matrix={mdrMatrix} onChange={setMdrMatrix} />
        )}
        {currentStep === 'fees' && <FeesStep form={form} />}
        {currentStep === 'preview' && (
          <PreviewStep
            contractData={form.getValues()}
            mdrMatrix={mdrMatrix}
            contractNumber={contractNumber}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </div>

      {currentStep !== 'preview' && (
        <WizardNavigation
          currentStep={currentStep}
          stepIndex={stepIndex}
          mdrIsValid={mdrValidation.isValid}
          mdrCanGenerate={mdrValidation.canGenerateContract}
          onBack={goBack}
          onNext={goNext}
        />
      )}
    </div>
  );
}
