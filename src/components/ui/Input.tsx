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
          <label htmlFor={inputId} className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.09em]">
            {label}
            {props.required && <span className="text-brand ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3.5 text-sm text-white/35 pointer-events-none select-none font-mono">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border bg-[#1F1F23] text-sm text-white placeholder:text-white/25',
              'px-3.5 py-3 shadow-sm transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
              'hover:border-white/20',
              'disabled:cursor-not-allowed disabled:bg-white/[0.04] disabled:text-white/30',
              error
                ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500/80'
                : 'border-white/[0.09]',
              prefix && 'pl-9',
              suffix && 'pr-10',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 text-sm text-white/35 pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-red-400 font-medium mt-0.5">{error}</p>}
        {hint && !error && <p className="text-[11px] text-white/35 mt-0.5">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
