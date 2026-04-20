import { cn } from '@/lib/utils';
import { STEPS, StepId } from './steps';

interface Props {
  currentStep: StepId;
  stepIndex: number;
  onGoToStep: (id: StepId) => void;
}

export function WizardStepIndicator({ currentStep, stepIndex, onGoToStep }: Props) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <button
            onClick={() => idx < stepIndex && onGoToStep(step.id)}
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
  );
}
