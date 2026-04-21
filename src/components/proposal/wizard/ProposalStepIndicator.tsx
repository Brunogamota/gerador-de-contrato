import { cn } from '@/lib/utils';
import { PROPOSAL_STEPS, ProposalStepId } from './steps';

type Step = typeof PROPOSAL_STEPS[number];

interface Props {
  currentStep: ProposalStepId;
  stepIndex: number;
  onGoToStep: (id: ProposalStepId) => void;
  steps?: readonly Step[];
}

export function ProposalStepIndicator({ currentStep, stepIndex, onGoToStep, steps = PROPOSAL_STEPS }: Props) {
  return (
    <div className="flex items-center gap-0 select-none">
      {steps.map((step, idx) => {
        const isDone   = idx < stepIndex;
        const isActive = currentStep === step.id;
        const isFuture = idx > stepIndex;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isDone && onGoToStep(step.id)}
              disabled={isFuture}
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap',
                isActive && 'text-white',
                isDone   && 'text-white/50 hover:text-white/80 cursor-pointer',
                isFuture && 'text-white/25 cursor-default',
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all',
                isActive && 'bg-brand text-white ring-4 ring-brand/20',
                isDone   && 'bg-emerald-500 text-white',
                isFuture && 'bg-white/10 text-white/30',
              )}>
                {isDone
                  ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  : idx + 1}
              </span>
              <span className={cn('text-xs', isActive && 'font-semibold')}>{step.shortLabel}</span>
            </button>

            {idx < steps.length - 1 && (
              <div className={cn(
                'w-8 h-px mx-2 flex-shrink-0 transition-colors',
                isDone ? 'bg-emerald-500/60' : 'bg-white/10',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
