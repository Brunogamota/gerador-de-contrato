'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ContractData, ContractDataSchema, DEFAULT_CONTRACT_DATA } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { validateMatrix } from '@/lib/calculations/validation';
import { generateContractNumber } from '@/lib/utils';
import { ClientInfoStep } from './steps/ClientInfoStep';
import { MDRStep } from './steps/MDRStep';
import { FeesStep } from './steps/FeesStep';
import { PreviewStep } from './steps/PreviewStep';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'client', label: 'Dados do Contratante', shortLabel: 'Cliente' },
  { id: 'mdr', label: 'Tabela MDR', shortLabel: 'MDR' },
  { id: 'fees', label: 'Taxas e Tarifas', shortLabel: 'Taxas' },
  { id: 'preview', label: 'Revisão e Geração', shortLabel: 'Prévia' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function ContractWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepId>('client');
  const [mdrMatrix, setMdrMatrix] = useState<MDRMatrix>(createEmptyMatrix);
  const [contractNumber] = useState(generateContractNumber);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ContractData>({
    resolver: zodResolver(ContractDataSchema),
    defaultValues: DEFAULT_CONTRACT_DATA,
    mode: 'onBlur',
  });

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

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

  async function handleSave() {
    const data = form.getValues();
    setIsSaving(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mdrMatrix, contractNumber }),
      });
      if (!res.ok) throw new Error('Save failed');
      const saved = await res.json();
      router.push(`/contracts/${saved.id}`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar o contrato. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  const mdrValidation = validateMatrix(mdrMatrix);

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-12">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => idx < stepIndex && setCurrentStep(step.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                currentStep === step.id
                  ? 'text-brand-700 bg-brand-50'
                  : idx < stepIndex
                  ? 'text-gray-600 hover:text-gray-900 cursor-pointer'
                  : 'text-gray-400 cursor-default'
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  currentStep === step.id
                    ? 'bg-brand-600 text-white'
                    : idx < stepIndex
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {idx < stepIndex ? '✓' : idx + 1}
              </span>
              <span className="hidden sm:block">{step.shortLabel}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px mx-2', idx < stepIndex ? 'bg-emerald-300' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
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

      {/* Navigation */}
      {currentStep !== 'preview' && (
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-medium transition-colors',
              stepIndex === 0
                ? 'text-gray-300 cursor-default'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            ← Voltar
          </button>

          <div className="flex items-center gap-3">
            {currentStep === 'mdr' && !mdrValidation.canGenerateContract && (
              <p className="text-sm text-amber-600">
                Preencha ao menos uma bandeira completa para continuar
              </p>
            )}
            <button
              onClick={goNext}
              disabled={currentStep === 'mdr' && !mdrValidation.isValid}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white',
                'hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-sm',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
