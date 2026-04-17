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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-ink-700 uppercase tracking-wide">
            {label}
            {props.required && <span className="text-brand ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-sm text-ink-500 pointer-events-none select-none font-mono">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border bg-white text-sm text-ink-900 placeholder:text-ink-400',
              'px-3 py-2.5 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
              'hover:border-ink-300',
              'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500',
              error
                ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400'
                : 'border-ink-200',
              prefix && 'pl-8',
              suffix && 'pr-10',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-sm text-ink-500 pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
