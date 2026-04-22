'use client';

import { cn } from '@/lib/utils';
import type { FeesSummary } from '@/lib/fees/pricingViewModel';

function Sparkline({ color = '#22c55e' }: { color?: string }) {
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none" className="opacity-90">
      <path
        d="M0 22 C8 20,14 16,22 14 S36 10,44 8 S58 4,64 2"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

function AlertSparkline() {
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none" className="opacity-90">
      <path
        d="M0 14 C8 12,16 8,22 12 S30 20,36 18 S50 10,64 14"
        stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

interface Props {
  summary: FeesSummary;
}

export function StrategySummaryCards({ summary }: Props) {
  const marginHealthy = summary.avgMargin >= summary.avgMarginTarget;
  const compColor =
    summary.competitiveness === 'Alta'
      ? 'text-emerald-400'
      : summary.competitiveness === 'Média'
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Margem média */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Margem média</p>
        <p className="text-3xl font-bold text-white tracking-tight">
          {summary.avgMargin.toFixed(2).replace('.', ',')}%
        </p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] text-white/40">
              Meta: ≥ {summary.avgMarginTarget.toFixed(2).replace('.', ',')}%
            </p>
            {marginHealthy ? (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Dentro da meta
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Abaixo da meta
              </span>
            )}
          </div>
          <Sparkline color={marginHealthy ? '#22c55e' : '#f59e0b'} />
        </div>
      </div>

      {/* Competitividade */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Competitividade</p>
        <p className={cn('text-3xl font-bold tracking-tight', compColor)}>
          {summary.competitiveness}
        </p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-[11px] text-white/40 leading-snug">
            {summary.competitivenessScore >= 75
              ? `Você está ${(100 - summary.competitivenessScore)}% acima da média`
              : `Você está ${(100 - summary.competitivenessScore)}% abaixo da média`}
          </p>
          <Sparkline color={summary.competitiveness === 'Alta' ? '#22c55e' : '#6366f1'} />
        </div>
      </div>

      {/* Impacto estimado */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Impacto estimado</p>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-sm font-semibold text-white/50">R$</span>
          <span className="text-3xl font-bold text-white tracking-tight whitespace-nowrap">
            {new Intl.NumberFormat('pt-BR').format(summary.estimatedImpactMonthly)}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-[11px] text-white/40 leading-snug">
            Margem mensal projetada<br />com base no volume atual
          </p>
          <Sparkline color="#a78bfa" />
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Alertas</p>
        <div className="flex items-baseline gap-2 leading-none">
          <span className="text-3xl font-bold text-white tracking-tight">{summary.alerts.length}</span>
          <span className="text-sm text-white/50">alertas</span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {summary.alerts.length === 0 ? (
              <p className="text-[11px] text-emerald-400">Tudo dentro do esperado</p>
            ) : (
              summary.alerts.map((a, i) => (
                <p key={i} className={cn(
                  'text-[11px] truncate',
                  a.type === 'error' ? 'text-red-400' : 'text-amber-400',
                )}>
                  {a.message}
                </p>
              ))
            )}
          </div>
          <AlertSparkline />
        </div>
      </div>
    </div>
  );
}
