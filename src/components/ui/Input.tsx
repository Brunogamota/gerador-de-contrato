import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefix, suffix, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-[10px] font-semibold text-ink-500 uppercase tracking-[0.09em]">
            {label}
            {props.required && <span className="text-brand ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3.5 text-sm text-ink-400 pointer-events-none select-none font-mono">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border bg-white text-sm text-ink-900 placeholder:text-ink-300',
              'px-3.5 py-3 shadow-sm transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand',
              'hover:border-ink-300',
              'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
              error
                ? 'border-red-400 focus:ring-red-300/40 focus:border-red-400'
                : 'border-ink-200',
              prefix && 'pl-9',
              suffix && 'pr-10',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 text-sm text-ink-400 pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-red-500 font-medium mt-0.5">{error}</p>}
        {hint && !error && <p className="text-[11px] text-ink-400 mt-0.5">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
