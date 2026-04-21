'use client';

import { IntlPricing } from '@/types/pricing';
import { cn } from '@/lib/utils';

interface Props {
  value: IntlPricing;
  onChange?: (v: IntlPricing) => void;
  readOnly?: boolean;
  variant?: 'light' | 'dark'; // light = wizard (white card), dark = settings page (ink-900 card)
}

function Field({
  label, value, onChange, prefix, suffix, placeholder = '0.00', readOnly, variant = 'light',
}: {
  label: string; value: string; onChange?: (v: string) => void;
  prefix?: string; suffix?: string; placeholder?: string;
  readOnly?: boolean; variant?: 'light' | 'dark';
}) {
  const inputCls = variant === 'dark'
    ? cn('border-ink-600 bg-ink-700 text-ink-100 placeholder:text-ink-500', readOnly && 'opacity-60 cursor-default')
    : cn('border-ink-200 bg-white text-ink-900 placeholder:text-ink-300', readOnly && 'opacity-60 cursor-default');

  return (
    <div className="flex flex-col gap-1.5">
      <label className={cn('text-xs font-semibold', variant === 'dark' ? 'text-ink-200' : 'text-ink-700')}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        {prefix && (
          <span className={cn('text-xs font-mono flex-shrink-0', variant === 'dark' ? 'text-ink-400' : 'text-ink-500')}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className={cn(
            'w-full px-2.5 py-1.5 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 transition-all',
            inputCls,
          )}
        />
        {suffix && (
          <span className={cn('text-xs font-mono flex-shrink-0', variant === 'dark' ? 'text-ink-400' : 'text-ink-500')}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({
  title, description, children, variant = 'light',
}: {
  title: string; description?: string; children: React.ReactNode; variant?: 'light' | 'dark';
}) {
  const wrapCls = variant === 'dark'
    ? 'bg-ink-800/50 border border-ink-700 rounded-xl p-4 flex flex-col gap-3'
    : 'bg-ink-50 border border-ink-200 rounded-xl p-4 flex flex-col gap-3';

  return (
    <div className={wrapCls}>
      <div>
        <p className={cn('text-sm font-bold', variant === 'dark' ? 'text-ink-100' : 'text-ink-900')}>{title}</p>
        {description && (
          <p className={cn('text-xs mt-0.5', variant === 'dark' ? 'text-ink-400' : 'text-ink-400')}>{description}</p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

export function IntlPricingForm({ value: v, onChange, readOnly, variant = 'light' }: Props) {
  const set = (key: keyof IntlPricing) => (val: string) => onChange?.({ ...v, [key]: val });
  const p = { readOnly, variant };

  return (
    <div className="flex flex-col gap-3">
      <Section title="Processamento" description="Custo base por transação" variant={variant}>
        <Field label="Taxa de processamento" value={v.processingRate} onChange={set('processingRate')} suffix="%" {...p} />
        <Field label="Fee fixo / transação" value={v.processingFlatFee} onChange={set('processingFlatFee')} prefix="$" {...p} />
        <div className="flex flex-col gap-1.5">
          <label className={cn('text-xs font-semibold', variant === 'dark' ? 'text-ink-200' : 'text-ink-700')}>Modelo</label>
          <input
            type="text"
            value={v.pricingModel}
            onChange={(e) => set('pricingModel')(e.target.value)}
            readOnly={readOnly}
            placeholder="IC+"
            className={cn(
              'w-full px-2.5 py-1.5 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 transition-all',
              variant === 'dark'
                ? 'border-ink-600 bg-ink-700 text-ink-100 placeholder:text-ink-500'
                : 'border-ink-200 bg-white text-ink-900 placeholder:text-ink-300',
              readOnly && 'opacity-60 cursor-default',
            )}
          />
        </div>
      </Section>

      <Section title="Commitment" description="Volume mínimo de fees por ano" variant={variant}>
        <Field label="Year 1 (Commitment)" value={v.year1Commitment} onChange={set('year1Commitment')} prefix="$" {...p} />
        <Field label="Year 2 (Commitment)" value={v.year2Commitment} onChange={set('year2Commitment')} prefix="$" {...p} />
      </Section>

      <Section title="Connect" description="Sub-contas e payouts" variant={variant}>
        <Field label="Taxa payout" value={v.connectPayoutRate} onChange={set('connectPayoutRate')} suffix="%" {...p} />
        <Field label="Fee payout fixo" value={v.connectPayoutFlatFee} onChange={set('connectPayoutFlatFee')} prefix="$" {...p} />
        <Field label="Mensalidade por conta" value={v.connectMonthlyFee} onChange={set('connectMonthlyFee')} prefix="$" {...p} />
        <Field label="Ativação de conta" value={v.connectActivationFee} onChange={set('connectActivationFee')} prefix="$" {...p} />
      </Section>

      <Section title="Radar" description="Antifraude" variant={variant}>
        <Field label="Standard / transação" value={v.radarStandardFee} onChange={set('radarStandardFee')} prefix="$" {...p} />
        <Field label="Rules & Filters / tx" value={v.radarRfftFee} onChange={set('radarRfftFee')} prefix="$" {...p} />
      </Section>

      <Section title="Payment Intel" description="Autenticação, tokens e atualização" variant={variant}>
        <Field label="3DS / tentativa" value={v.intel3dsFee} onChange={set('intel3dsFee')} prefix="$" {...p} />
        <Field label="Adaptive Acceptance" value={v.intelAdaptiveRate} onChange={set('intelAdaptiveRate')} suffix="%" {...p} />
        <Field label="Atualização de cartão" value={v.intelCardUpdaterFee} onChange={set('intelCardUpdaterFee')} prefix="$" {...p} />
        <Field label="Network Token fee" value={v.intelNetworkTokenFee} onChange={set('intelNetworkTokenFee')} prefix="$" {...p} />
      </Section>

      <Section title="Outras Tarifas" description="FX, disputas e chargebacks" variant={variant}>
        <Field label="Foreign Exchange" value={v.fxFeeRate} onChange={set('fxFeeRate')} suffix="%" {...p} />
        <Field label="Disputa perdida" value={v.disputeLostFee} onChange={set('disputeLostFee')} prefix="$" {...p} />
        <Field label="Por disputa" value={v.disputeFee} onChange={set('disputeFee')} prefix="$" {...p} />
      </Section>
    </div>
  );
}
