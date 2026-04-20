import { cn } from '@/lib/utils';
import { PROPOSAL_STEPS, ProposalStepId } from './steps';

interface Props {
  currentStep: ProposalStepId;
  stepIndex: number;
  onGoToStep: (id: ProposalStepId) => void;
}

export function ProposalStepIndicator({ currentStep, stepIndex, onGoToStep }: Props) {
  return (
    <div className="flex items-center gap-0 select-none">
      {PROPOSAL_STEPS.map((step, idx) => {
        const isDone    = idx < stepIndex;
        const isActive  = currentStep === step.id;
        const isFuture  = idx > stepIndex;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => isDone && onGoToStep(step.id)}
              disabled={isFuture}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive  && 'text-brand bg-brand/8 font-semibold',
                isDone    && 'text-ink-600 hover:text-ink-900 hover:bg-ink-50 cursor-pointer',
                isFuture  && 'text-ink-300 cursor-default',
              )}
            >
              <span
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                  isActive  && 'bg-brand text-white shadow-sm shadow-brand/30',
                  isDone    && 'bg-emerald-500 text-white',
                  isFuture  && 'bg-ink-100 text-ink-400',
                )}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </span>
              <span className="hidden sm:block">{step.shortLabel}</span>
            </button>
            {idx < PROPOSAL_STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-1 transition-colors',
                isDone ? 'bg-emerald-300' : 'bg-ink-100',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
