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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-ink-700 uppercase tracking-wide">
            {label}
            {props.required && <span className="text-brand ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-xl border bg-white text-sm text-ink-900 appearance-none',
            'px-3 py-2.5 transition-all duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
            'hover:border-ink-300',
            'disabled:cursor-not-allowed disabled:bg-ink-50',
            error ? 'border-red-400' : 'border-ink-200',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export { Select };
