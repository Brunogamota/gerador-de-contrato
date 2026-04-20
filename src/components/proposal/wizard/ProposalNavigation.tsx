import { cn } from '@/lib/utils';
import { ProposalStepId } from './steps';

interface Props {
  currentStep: ProposalStepId;
  stepIndex: number;
  mdrIsValid: boolean;
  mdrCanGenerate: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function ProposalNavigation({ currentStep, stepIndex, mdrIsValid, mdrCanGenerate, onBack, onNext }: Props) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onBack}
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
        {currentStep === 'cost' && !mdrCanGenerate && (
          <p className="text-sm text-amber-600">
            Preencha ao menos uma bandeira para continuar
          </p>
        )}
        <button
          onClick={onNext}
          disabled={false}
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
  );
}
