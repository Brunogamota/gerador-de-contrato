import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'dark';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-ink-100 text-ink-600',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    danger:  'bg-red-50 text-red-700 ring-1 ring-red-200',
    brand:   'bg-brand-50 text-brand ring-1 ring-brand-200',
    dark:    'bg-ink-900 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
