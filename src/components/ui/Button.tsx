import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ' +
      'disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap';

    const variants = {
      primary:
        'bg-brand text-white hover:bg-brand-400 active:bg-brand-deep shadow-sm hover:shadow-glow',
      secondary:
        'bg-brand-50 text-brand hover:bg-brand-100 active:bg-brand-200 border border-brand-200',
      ghost:
        'text-ink-700 hover:bg-ink-100 active:bg-ink-200',
      danger:
        'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-sm',
      outline:
        'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-300 shadow-card',
      dark:
        'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 shadow-sm',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
