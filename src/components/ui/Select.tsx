import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={selectId} className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.09em]">
            {label}
            {props.required && <span className="text-brand ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-xl border bg-[#1F1F23] text-sm text-white appearance-none',
            'px-3.5 py-3 shadow-sm transition-all duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
            'hover:border-white/20',
            'disabled:cursor-not-allowed disabled:bg-white/[0.04] disabled:text-white/30',
            error ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500/80' : 'border-white/[0.09]',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-[11px] text-red-400 font-medium mt-0.5">{error}</p>}
        {hint && !error && <p className="text-[11px] text-white/35 mt-0.5">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export { Select };
