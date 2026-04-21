'use client';

import { cn } from '@/lib/utils';
import type { SmartSuggestion } from '@/lib/mdr-analyzer/types';

interface SmartSuggestionsBlockProps {
  suggestions: SmartSuggestion[];
}

const TYPE_CONFIG = {
  opportunity: {
    border:    'border-emerald-500/20',
    iconBg:    'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    impactBg:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  warning: {
    border:    'border-amber-500/20',
    iconBg:    'bg-amber-500/10',
    iconColor: 'text-amber-400',
    impactBg:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    border:    'border-blue-500/20',
    iconBg:    'bg-blue-500/10',
    iconColor: 'text-blue-400',
    impactBg:  'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
} as const;

export function SmartSuggestionsBlock({ suggestions }: SmartSuggestionsBlockProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-[#18181B] rounded-2xl border border-white/[0.06] p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg,rgba(247,38,98,0.12),rgba(119,19,57,0.12))',
            border: '1px solid rgba(247,38,98,0.22)',
          }}
        >
          <svg className="w-3.5 h-3.5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Sugestão inteligente</span>
          <span className="text-[10px] text-white/30">• com base nos dados atuais</span>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((s, i) => {
          const cfg = TYPE_CONFIG[s.type];
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border bg-white/[0.015]',
                cfg.border,
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.iconBg, cfg.iconColor)}>
                {cfg.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white leading-snug">{s.title}</p>
                <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{s.description}</p>
              </div>
              {s.impact && (
                <span className={cn('text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shrink-0 mt-0.5', cfg.impactBg)}>
                  {s.impact}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
