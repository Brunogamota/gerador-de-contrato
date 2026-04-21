'use client';

import { UseFormReturn } from 'react-hook-form';
import { ContractData } from '@/types/contract';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface FeesStepProps {
  form: UseFormReturn<ContractData>;
}

interface FeeFieldDef {
  key: keyof ContractData;
  label: string;
  hint: string;
  prefix?: string;
  suffix?: string;
}

const OPERACIONAIS: FeeFieldDef[] = [
  { key: 'setup',         label: 'Setup',              hint: 'Valor único cobrado na assinatura',             prefix: 'R$' },
  { key: 'feeTransacao',  label: 'Fee por Transação',  hint: 'Por cada transação processada',                 prefix: 'R$' },
  { key: 'taxaAntifraude',label: 'Taxa Antifraude',    hint: 'Por transação verificada pelo antifraude',      prefix: 'R$' },
  { key: 'taxaPix',       label: 'Taxa PIX In',        hint: 'Por cada transação PIX recebida',               prefix: 'R$' },
  { key: 'taxaPixOut',    label: 'Taxa PIX Out',        hint: 'Por cada PIX enviado',                          prefix: 'R$' },
  { key: 'taxaSplit',     label: 'Taxa por Split',      hint: 'Por cada operação de split criada',             prefix: 'R$' },
];

const FINANCEIRAS: FeeFieldDef[] = [
  { key: 'taxaAntecipacao', label: 'Taxa de Antecipação', hint: 'Quando solicitada pelo contratante', suffix: '%' },
];

const RISCO: FeeFieldDef[] = [
  { key: 'taxaEstorno',       label: 'Taxa de Estorno',       hint: 'Por cada estorno solicitado',          prefix: 'R$' },
  { key: 'taxaPreChargeback', label: 'Taxa Pré-Chargeback',   hint: 'Por cada pré-chargeback recebido',     prefix: 'R$' },
  { key: 'taxaChargeback',    label: 'Taxa de Chargeback',    hint: 'Por cada chargeback gerado',           prefix: 'R$' },
  { key: 'valorMinimoMensal', label: 'Valor Mínimo Mensal',  hint: 'Cobrança mínima se o volume for baixo', prefix: 'R$' },
];

function GroupSection({ title, icon, fields, register }: {
  title: string;
  icon: string;
  fields: FeeFieldDef[];
  register: UseFormReturn<ContractData>['register'];
}) {
  return (
    <div className="rounded-2xl border border-ink-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-ink-50 border-b border-ink-200">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            hint={field.hint}
            prefix={field.prefix}
            suffix={field.suffix}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            {...register(field.key)}
          />
        ))}
      </div>
    </div>
  );
}

export function FeesStep({ form }: FeesStepProps) {
  const { register } = form;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900 mb-1">Taxas e Tarifas</h2>
        <p className="text-sm text-ink-500">
          Configure todas as cobranças operacionais. Esses valores serão refletidos no Anexo II do contrato.
        </p>
      </div>

      <GroupSection title="Operacionais" icon="⚙" fields={OPERACIONAIS} register={register} />

      <div className="rounded-2xl border border-ink-200 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 bg-ink-50 border-b border-ink-200">
          <span className="text-base">📅</span>
          <h3 className="text-sm font-semibold text-ink-800">Financeiras</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
          {FINANCEIRAS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              hint={field.hint}
              prefix={field.prefix}
              suffix={field.suffix}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              {...register(field.key)}
            />
          ))}
          <Select label="Prazo de Recebimento" {...register('prazoRecebimento')}>
            <option value="D0">D+0 (mesmo dia)</option>
            <option value="D1">D+1 (1 dia útil)</option>
            <option value="D2">D+2 (2 dias úteis)</option>
            <option value="D30">D+30 (30 dias)</option>
          </Select>
        </div>
      </div>

      <GroupSection title="Risco e Disputas" icon="⚠" fields={RISCO} register={register} />
    </div>
  );
}
