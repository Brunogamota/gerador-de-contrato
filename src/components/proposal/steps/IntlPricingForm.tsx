'use client';

import { IntlPricing } from '@/types/pricing';
import { cn } from '@/lib/utils';

interface Props {
  value: IntlPricing;
  onChange?: (v: IntlPricing) => void;
  readOnly?: boolean;
}

function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder = '0.00',
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-ink-700">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-ink-500 font-mono flex-shrink-0">{prefix}</span>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className={cn(
            'w-full px-2.5 py-1.5 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 transition-all',
            readOnly
              ? 'border-ink-100 bg-ink-50 text-ink-500 cursor-default'
              : 'border-ink-200 bg-white text-ink-900 placeholder:text-ink-300',
          )}
        />
        {suffix && <span className="text-xs text-ink-500 font-mono flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-50 border border-ink-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-bold text-ink-900">{title}</p>
        {description && <p className="text-xs text-ink-400 mt-0.5">{description}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

export function IntlPricingForm({ value: v, onChange, readOnly }: Props) {
  const set = (key: keyof IntlPricing) => (val: string) =>
    onChange?.({ ...v, [key]: val });

  return (
    <div className="flex flex-col gap-3">
      <Section title="Processamento" description="Custo base por transação">
        <Field label="Taxa de processamento" value={v.processingRate} onChange={set('processingRate')} suffix="%" readOnly={readOnly} />
        <Field label="Fee fixo / transação" value={v.processingFlatFee} onChange={set('processingFlatFee')} prefix="$" readOnly={readOnly} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-700">Modelo</label>
          <input
            type="text"
            value={v.pricingModel}
            onChange={(e) => set('pricingModel')(e.target.value)}
            readOnly={readOnly}
            placeholder="IC+"
            className={cn(
              'w-full px-2.5 py-1.5 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 transition-all',
              readOnly
                ? 'border-ink-100 bg-ink-50 text-ink-500 cursor-default'
                : 'border-ink-200 bg-white text-ink-900 placeholder:text-ink-300',
            )}
          />
        </div>
      </Section>

      <Section title="Commitment" description="Volume mínimo de fees por ano">
        <Field label="Year 1 (Stripe Fees)" value={v.year1Commitment} onChange={set('year1Commitment')} prefix="$" readOnly={readOnly} />
        <Field label="Year 2 (Stripe Fees)" value={v.year2Commitment} onChange={set('year2Commitment')} prefix="$" readOnly={readOnly} />
      </Section>

      <Section title="Stripe Connect" description="Sub-contas e payouts">
        <Field label="Taxa payout" value={v.connectPayoutRate} onChange={set('connectPayoutRate')} suffix="%" readOnly={readOnly} />
        <Field label="Fee payout fixo" value={v.connectPayoutFlatFee} onChange={set('connectPayoutFlatFee')} prefix="$" readOnly={readOnly} />
        <Field label="Mensalidade por conta" value={v.connectMonthlyFee} onChange={set('connectMonthlyFee')} prefix="$" readOnly={readOnly} />
        <Field label="Ativação de conta" value={v.connectActivationFee} onChange={set('connectActivationFee')} prefix="$" readOnly={readOnly} />
      </Section>

      <Section title="Radar" description="Antifraude Stripe">
        <Field label="Standard / transação" value={v.radarStandardFee} onChange={set('radarStandardFee')} prefix="$" readOnly={readOnly} />
        <Field label="Rules & Filters / transação" value={v.radarRfftFee} onChange={set('radarRfftFee')} prefix="$" readOnly={readOnly} />
      </Section>

      <Section title="Payment Intel" description="Autenticação, tokens e atualização">
        <Field label="3DS / tentativa" value={v.intel3dsFee} onChange={set('intel3dsFee')} prefix="$" readOnly={readOnly} />
        <Field label="Adaptive Acceptance" value={v.intelAdaptiveRate} onChange={set('intelAdaptiveRate')} suffix="%" readOnly={readOnly} />
        <Field label="Atualização de cartão" value={v.intelCardUpdaterFee} onChange={set('intelCardUpdaterFee')} prefix="$" readOnly={readOnly} />
        <Field label="Network Token fee" value={v.intelNetworkTokenFee} onChange={set('intelNetworkTokenFee')} prefix="$" readOnly={readOnly} />
      </Section>

      <Section title="Outras Tarifas" description="FX, disputas e chargebacks">
        <Field label="Foreign Exchange" value={v.fxFeeRate} onChange={set('fxFeeRate')} suffix="%" readOnly={readOnly} />
        <Field label="Disputa perdida" value={v.disputeLostFee} onChange={set('disputeLostFee')} prefix="$" readOnly={readOnly} />
        <Field label="Por disputa" value={v.disputeFee} onChange={set('disputeFee')} prefix="$" readOnly={readOnly} />
      </Section>
    </div>
  );
}
