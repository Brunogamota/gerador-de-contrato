'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProposalData } from '@/types/proposal';
import { Input } from '@/components/ui/Input';
import { formatCnpj, formatPhone } from '@/lib/utils';

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Dados do Cliente</h2>
        <p className="text-sm text-gray-500">
          Informações da empresa destinatária desta proposta comercial
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

      {/* Representante Legal */}
      <div className="rounded-2xl border border-ink-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRepLegal((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-ink-50 hover:bg-ink-100 transition-colors text-left"
        >
          <div>
            <p className="text-sm font-semibold text-ink-900">Representante Legal</p>
            <p className="text-xs text-ink-500 mt-0.5">
              Pessoa física que assina em nome do cliente — aparece na proposta
            </p>
          </div>
          <span className="text-ink-400 text-lg ml-4 flex-shrink-0">{showRepLegal ? '−' : '+'}</span>
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

      <hr className="border-gray-100" />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Detalhes da Proposta</h2>
        <p className="text-sm text-gray-500">Validade e observações comerciais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Válida até"
          required
          placeholder="DD/MM/AAAA"
          error={errors.validadeAte?.message}
          {...register('validadeAte')}
        />

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Observações <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Condições especiais, descontos negociados, informações adicionais..."
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none"
            {...register('observacoes')}
          />
        </div>
      </div>
    </div>
  );
}
