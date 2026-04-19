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

const FEE_FIELDS: FeeFieldDef[] = [
  { key: 'setup', label: 'Setup', hint: 'Valor único cobrado na assinatura', prefix: 'R$' },
  { key: 'feeTransacao', label: 'Fee por Transação', hint: 'Por cada transação processada', prefix: 'R$' },
  { key: 'taxaAntifraude', label: 'Taxa Antifraude', hint: 'Por transação verificada pelo antifraude', prefix: 'R$' },
  { key: 'taxaPix', label: 'Taxa PIX In', hint: 'Por cada transação PIX recebida', prefix: 'R$' },
  { key: 'taxaPixOut', label: 'Taxa PIX Out', hint: 'Por cada PIX enviado', prefix: 'R$' },
  { key: 'taxaSplit', label: 'Taxa por Split', hint: 'Por cada operação de split criada', prefix: 'R$' },
  { key: 'taxaEstorno', label: 'Taxa de Estorno', hint: 'Por cada estorno solicitado', prefix: 'R$' },
  { key: 'taxaAntecipacao', label: 'Taxa de Antecipação', hint: 'Quando solicitada pelo contratante', suffix: '%' },
  { key: 'taxaPreChargeback', label: 'Taxa Pré-Chargeback', hint: 'Por cada pré-chargeback recebido', prefix: 'R$' },
  { key: 'taxaChargeback', label: 'Taxa de Chargeback', hint: 'Por cada chargeback gerado', prefix: 'R$' },
  { key: 'valorMinimoMensal', label: 'Valor Mínimo Mensal', hint: 'Cobrança mínima caso o volume seja baixo (use ponto como decimal: 5000.00)', prefix: 'R$' },
];

export function FeesStep({ form }: FeesStepProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Taxas e Tarifas</h2>
        <p className="text-sm text-gray-500">
          Configure todas as cobranças operacionais. Esses valores serão refletidos no Anexo II do
          contrato.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {FEE_FIELDS.map((field) => (
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

      {/* Condições especiais */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Condições Especiais</h3>
        <p className="text-sm text-gray-500 mb-5">
          Parcelamento do setup e isenção temporária do fee mínimo mensal.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="Parcelamento do Setup"
            hint="Número de parcelas para pagamento do setup"
            {...register('setupParcelas', { valueAsNumber: true })}
          >
            <option value={1}>À vista (1×)</option>
            <option value={2}>2× parcelas</option>
            <option value={3}>3× parcelas</option>
            <option value={6}>6× parcelas</option>
            <option value={12}>12× parcelas</option>
          </Select>

          <Select
            label="Isenção do Fee Mínimo Mensal"
            hint="Número de meses iniciais sem cobrança do fee mínimo"
            {...register('isencaoFeeAteMeses', { valueAsNumber: true })}
          >
            <option value={0}>Sem isenção</option>
            <option value={1}>1 mês</option>
            <option value={2}>2 meses</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800 mb-1">Formato dos valores monetários</p>
        <p className="text-sm text-amber-700">
          Use ponto como separador decimal: <strong>5000.00</strong> para R$ 5.000,00.
          Todos os valores são armazenados como strings decimais para garantir precisão total.
        </p>
      </div>
    </div>
  );
}
