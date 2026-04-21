'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProposalData } from '@/types/proposal';
import { Input } from '@/components/ui/Input';
import { formatCnpj, formatPhone, cn } from '@/lib/utils';

const TIPO_OPTIONS = [
  { id: 'brasil', label: '🇧🇷 Brasil (MDR)',         desc: 'Tabela MDR + taxas operacionais' },
  { id: 'intl',   label: '🌐 Internacional',          desc: 'Processamento internacional (cross-border)' },
  { id: 'both',   label: '🌍 Brasil + Internacional', desc: 'Proposta completa com ambos os mercados' },
] as const;

interface ProposalInfoStepProps {
  form: UseFormReturn<ProposalData>;
}

export function ProposalInfoStep({ form }: ProposalInfoStepProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const [showRepLegal, setShowRepLegal] = useState(
    !!(watch('repLegalNome') || watch('repLegalCpf'))
  );

  const tipoMercado = watch('tipoMercado') ?? 'brasil';

  return (
    <div className="flex flex-col gap-8">

      {/* ── Tipo de proposta ─────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-ink-950 tracking-tight mb-0.5">Tipo de Proposta</h2>
        <p className="text-sm text-ink-400 mb-4">Selecione o mercado para esta proposta</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TIPO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setValue('tipoMercado', opt.id)}
              className={cn(
                'text-left rounded-xl border-2 px-4 py-3.5 transition-all',
                tipoMercado === opt.id
                  ? 'border-brand bg-brand/5 shadow-sm'
                  : 'border-ink-200 bg-white hover:border-ink-300',
              )}
            >
              <p className={cn('text-sm font-semibold', tipoMercado === opt.id ? 'text-brand' : 'text-ink-900')}>
                {opt.label}
              </p>
              <p className="text-xs text-ink-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Dados do cliente ─────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-ink-950 tracking-tight mb-0.5">Dados do Cliente</h2>
        <p className="text-sm text-ink-400">
          Empresa destinatária desta proposta comercial
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Input
            label="Razão Social / Nome"
            required
            placeholder="Ex: WHITE PAY LTDA"
            error={errors.contratanteNome?.message}
            {...register('contratanteNome')}
          />
        </div>

        <Input
          label="CNPJ / CPF"
          required
          placeholder="00.000.000/0001-00"
          error={errors.contratanteCnpj?.message}
          value={watch('contratanteCnpj')}
          onChange={(e) => setValue('contratanteCnpj', formatCnpj(e.target.value))}
        />

        <Input
          label="Telefone"
          required
          placeholder="(11) 99999-9999"
          error={errors.contratanteTelefone?.message}
          value={watch('contratanteTelefone')}
          onChange={(e) => setValue('contratanteTelefone', formatPhone(e.target.value))}
        />

        <div className="md:col-span-2">
          <Input
            label="Endereço Completo"
            required
            placeholder="Rua, número, complemento, bairro, cidade/UF, CEP"
            error={errors.contratanteEndereco?.message}
            {...register('contratanteEndereco')}
          />
        </div>

        <Input
          label="E-mail"
          required
          type="email"
          placeholder="contato@empresa.com.br"
          error={errors.contratanteEmail?.message}
          {...register('contratanteEmail')}
        />
      </div>

      {/* ── Representante Legal (collapsible) ────────────────────── */}
      <div className="rounded-xl border border-ink-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRepLegal((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-ink-50 hover:bg-ink-100 transition-colors text-left"
        >
          <div>
            <p className="text-sm font-semibold text-ink-800">Representante Legal</p>
            <p className="text-xs text-ink-400 mt-0.5">
              Pessoa física que assina em nome do cliente — opcional
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-ink-400 transition-transform flex-shrink-0 ml-4 ${showRepLegal ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showRepLegal && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-ink-200 bg-white">
            <div className="md:col-span-2">
              <Input
                label="Nome Completo"
                placeholder="Ex: João Silva Santos"
                {...register('repLegalNome')}
              />
            </div>

            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={watch('repLegalCpf')}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                const f = v
                  .slice(0, 11)
                  .replace(/(\d{3})(\d)/, '$1.$2')
                  .replace(/(\d{3})(\d)/, '$1.$2')
                  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                setValue('repLegalCpf', f);
              }}
            />

            <Input
              label="RG (opcional)"
              placeholder="00.000.000-0"
              {...register('repLegalRg')}
            />

            <Input
              label="Cargo / Qualificação"
              placeholder="Ex: Diretor, Sócio-Administrador"
              {...register('repLegalCargo')}
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="rep@empresa.com.br"
              {...register('repLegalEmail')}
            />

            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              value={watch('repLegalTelefone')}
              onChange={(e) => setValue('repLegalTelefone', formatPhone(e.target.value))}
            />
          </div>
        )}
      </div>

      {/* ── Detalhes da Proposta ──────────────────────────────────── */}
      <div className="pt-2 border-t border-ink-100">
        <h2 className="text-base font-semibold text-ink-950 tracking-tight mb-0.5 mt-4">Detalhes da Proposta</h2>
        <p className="text-sm text-ink-400">Validade e observações comerciais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Válida até"
          required
          placeholder="DD/MM/AAAA"
          error={errors.validadeAte?.message}
          {...register('validadeAte')}
        />

        <Input
          label="MCC"
          placeholder="Ex: 5411"
          error={errors.mcc?.message}
          {...register('mcc')}
        />

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-ink-700 mb-1.5">
            Observações <span className="text-ink-400 font-normal">(opcional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Condições especiais, descontos negociados, informações adicionais..."
            className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 transition-all resize-none"
            {...register('observacoes')}
          />
        </div>
      </div>

    </div>
  );
}
