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

export function ProposalNavigation({ currentStep, stepIndex, mdrCanGenerate, onBack, onNext }: Props) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        onClick={onBack}
        disabled={stepIndex === 0}
        className={cn(
          'flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
          stepIndex === 0
            ? 'text-ink-200 cursor-default'
            : 'text-ink-500 hover:text-ink-900 hover:bg-ink-50 border border-transparent hover:border-ink-200',
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar
      </button>

      <div className="flex items-center gap-3">
        {currentStep === 'cost' && !mdrCanGenerate && (
          <p className="text-xs text-amber-600 font-medium hidden sm:block">
            Preencha ao menos uma bandeira para continuar
          </p>
        )}
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand/90 active:scale-95 transition-all shadow-sm shadow-brand/20"
        >
          Continuar
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
