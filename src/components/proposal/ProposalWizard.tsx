'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProposalData, ProposalDataSchema, DEFAULT_PROPOSAL_DATA } from '@/types/proposal';
import { MDRMatrix } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { validateMatrix } from '@/lib/calculations/validation';
import { generateProposalNumber } from '@/lib/utils';
import { ProposalInfoStep } from './steps/ProposalInfoStep';
import { ProposalPreviewStep } from './steps/ProposalPreviewStep';
import { MDRStep } from '@/components/contract/steps/MDRStep';
import { FeesStep } from '@/components/contract/steps/FeesStep';
import { PROPOSAL_STEPS, ProposalStepId } from './wizard/steps';
import { ProposalStepIndicator } from './wizard/ProposalStepIndicator';
import { ProposalNavigation } from './wizard/ProposalNavigation';
import { useProposalSave } from './wizard/useProposalSave';
import { ContractData } from '@/types/contract';
import { UseFormReturn } from 'react-hook-form';

export function ProposalWizard() {
  const [currentStep, setCurrentStep] = useState<ProposalStepId>('info');
  const [mdrMatrix, setMdrMatrix] = useState<MDRMatrix>(createEmptyMatrix);
  const [proposalNumber] = useState(generateProposalNumber);

  const form = useForm<ProposalData>({
    resolver: zodResolver(ProposalDataSchema),
    defaultValues: DEFAULT_PROPOSAL_DATA,
    mode: 'onBlur',
  });

  const stepIndex = PROPOSAL_STEPS.findIndex((s) => s.id === currentStep);
  const mdrValidation = validateMatrix(mdrMatrix);

  const { handleSave, isSaving } = useProposalSave({
    getValues: form.getValues,
    mdrMatrix,
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

  // ProposalData is a superset of ContractData; cast is safe for FeesStep
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
        {currentStep === 'mdr' && (
          <MDRStep matrix={mdrMatrix} onChange={setMdrMatrix} />
        )}
        {currentStep === 'fees' && <FeesStep form={contractForm} />}
        {currentStep === 'preview' && (
          <ProposalPreviewStep
            proposalData={form.getValues()}
            mdrMatrix={mdrMatrix}
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
          mdrIsValid={mdrValidation.isValid}
          mdrCanGenerate={mdrValidation.canGenerateContract}
          onBack={goBack}
          onNext={goNext}
        />
      )}
    </div>
  );
}
