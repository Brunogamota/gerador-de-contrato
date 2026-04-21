'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ContractData } from '@/types/contract';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCnpj, formatPhone } from '@/lib/utils';

interface ClientInfoStepProps {
  form: UseFormReturn<ContractData>;
}

export function ClientInfoStep({ form }: ClientInfoStepProps) {
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
        <h2 className="text-lg font-semibold text-ink-900 mb-1">Dados do Contratante</h2>
        <p className="text-sm text-ink-500">
          Informações da empresa que vai assinar o contrato como CONTRATANTE
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Input
            label="Razão Social / Nome"
            placeholder="Ex: WHITE PAY LTDA"
            error={errors.contratanteNome?.message}
            {...register('contratanteNome')}
          />
        </div>

        <Input
          label="CNPJ / CPF"
          placeholder="00.000.000/0001-00"
          error={errors.contratanteCnpj?.message}
          value={watch('contratanteCnpj')}
          onChange={(e) => setValue('contratanteCnpj', formatCnpj(e.target.value))}
        />

        <Input
          label="Telefone"
          placeholder="(11) 99999-9999"
          error={errors.contratanteTelefone?.message}
          value={watch('contratanteTelefone')}
          onChange={(e) => setValue('contratanteTelefone', formatPhone(e.target.value))}
        />

        <div className="md:col-span-2">
          <Input
            label="Endereço Completo"
            placeholder="Rua, número, complemento, bairro, cidade/UF, CEP"
            error={errors.contratanteEndereco?.message}
            {...register('contratanteEndereco')}
          />
        </div>

        <Input
          label="E-mail"
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
              Pessoa física que assina em nome do CONTRATANTE — aparece no contrato e na assinatura
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
        <h2 className="text-lg font-semibold text-ink-900 mb-1">Termos do Contrato</h2>
        <p className="text-sm text-ink-500">Vigência, datas e foro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Input
          label="Data de Início"
          placeholder="DD/MM/AAAA"
          error={errors.dataInicio?.message}
          {...register('dataInicio')}
        />

        <Select label="Vigência" {...register('vigenciaMeses', { valueAsNumber: true })}>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
          <option value={24}>24 meses</option>
          <option value={36}>36 meses</option>
        </Select>

        <Input
          label="Foro de eleição"
          placeholder="São Paulo/SP"
          {...register('foro')}
        />
      </div>
    </div>
  );
}
