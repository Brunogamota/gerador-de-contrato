'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContractData, ContractDataSchema } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { validateMatrix } from '@/lib/calculations/validation';
import { ClientInfoStep } from './steps/ClientInfoStep';
import { MDRStep } from './steps/MDRStep';
import { FeesStep } from './steps/FeesStep';
import { STEPS, StepId } from './wizard/steps';
import { WizardStepIndicator } from './wizard/WizardStepIndicator';
import { WizardNavigation } from './wizard/WizardNavigation';
import { useContractEdit } from './wizard/useContractEdit';
import { ContractDocument } from './ContractDocument';
import { ContractActions } from './ContractActions';
import { Button } from '@/components/ui/Button';

interface ContractEditWizardProps {
  contractId:     string;
  contractNumber: string;
  initialData:    ContractData;
  initialMatrix:  MDRMatrix;
}

export function ContractEditWizard({
  contractId,
  contractNumber,
  initialData,
  initialMatrix,
}: ContractEditWizardProps) {
  const [currentStep, setCurrentStep] = useState<StepId>('client');
  const [mdrMatrix, setMdrMatrix]     = useState<MDRMatrix>(initialMatrix);
  const [liveData, setLiveData]       = useState<ContractData>(initialData);

  const form = useForm<ContractData>({
    resolver:      zodResolver(ContractDataSchema),
    defaultValues: initialData,
    mode:          'onBlur',
  });

  const stepIndex    = STEPS.findIndex((s) => s.id === currentStep);
  const mdrValidation = validateMatrix(mdrMatrix);

  const { handleSave, isSaving } = useContractEdit({
    contractId,
    getValues: form.getValues,
    mdrMatrix,
  });

  async function goNext() {
    if (currentStep === 'client') {
      const ok = await form.trigger([
        'contratanteNome', 'contratanteCnpj', 'contratanteEndereco',
        'contratanteEmail', 'contratanteTelefone', 'dataInicio',
      ]);
      if (!ok) return;
    }
    setLiveData(form.getValues());
    const next = stepIndex + 1;
    if (next < STEPS.length) setCurrentStep(STEPS[next].id);
  }

  function goBack() {
    const prev = stepIndex - 1;
    if (prev >= 0) setCurrentStep(STEPS[prev].id);
  }

  // Update live preview whenever the user arrives at preview step
  function handleGoToStep(step: StepId) {
    setLiveData(form.getValues());
    setCurrentStep(step);
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-12">
      <WizardStepIndicator
        currentStep={currentStep}
        stepIndex={stepIndex}
        onGoToStep={handleGoToStep}
      />

      <div className="bg-[#18181B] rounded-2xl border border-white/[0.06] shadow-card p-6 md:p-8">
        {currentStep === 'client'  && <ClientInfoStep form={form} />}
        {currentStep === 'mdr'     && <MDRStep matrix={mdrMatrix} onChange={setMdrMatrix} />}
        {currentStep === 'fees'    && <FeesStep form={form} />}
        {currentStep === 'preview' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Pré-visualização</h2>
                <p className="text-sm text-white/50">Revise e salve as alterações.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ContractActions contractNumber={contractNumber} />
                <Button onClick={handleSave} loading={isSaving}>
                  Salvar Alterações
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="bg-white/[0.03] border-b border-white/[0.08] px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-white/40 ml-2">Contrato #{contractNumber}</span>
              </div>
              <div className="overflow-y-auto max-h-[700px]">
                <ContractDocument
                  contractData={liveData}
                  mdrMatrix={mdrMatrix}
                  contractNumber={contractNumber}
                />
              </div>
            </div>
          </div>
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
