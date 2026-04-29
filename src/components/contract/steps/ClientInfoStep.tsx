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

interface CnpjResult {
  nome:     string;
  fantasia: string;
  endereco: string;
  email:    string;
  telefone: string;
  situacao: string;
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
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjFeedback, setCnpjFeedback] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);

  async function handleCnpjLookup() {
    const rawCnpj = watch('contratanteCnpj').replace(/\D/g, '');
    if (rawCnpj.length !== 14) {
      setCnpjFeedback({ type: 'error', msg: 'Preencha o CNPJ com 14 dígitos antes de buscar.' });
      return;
    }
    setCnpjLoading(true);
    setCnpjFeedback(null);

    try {
      const res = await fetch(`/api/cnpj/${rawCnpj}`);
      const data: CnpjResult & { error?: string } = await res.json();

      if (!res.ok || data.error) {
        setCnpjFeedback({ type: 'error', msg: data.error ?? 'CNPJ não encontrado.' });
        return;
      }

      if (data.nome)     setValue('contratanteNome',     data.nome);
      if (data.endereco) setValue('contratanteEndereco', data.endereco);
      if (data.email)    setValue('contratanteEmail',    data.email);
      if (data.telefone) setValue('contratanteTelefone', data.telefone);

      const situacaoNote = data.situacao && data.situacao !== 'ATIVA'
        ? ` — situação: ${data.situacao}`
        : '';
      setCnpjFeedback({
        type: 'ok',
        msg: `Dados preenchidos: ${data.nome}${situacaoNote}`,
      });
    } catch {
      setCnpjFeedback({ type: 'error', msg: 'Falha ao conectar com a Receita Federal.' });
    } finally {
      setCnpjLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Dados do Contratante</h2>
        <p className="text-sm text-white/50">
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

        {/* CNPJ + buscar */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
            CNPJ / CPF
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/50 transition-all"
              placeholder="00.000.000/0001-00"
              value={watch('contratanteCnpj')}
              onChange={(e) => {
                setValue('contratanteCnpj', formatCnpj(e.target.value));
                setCnpjFeedback(null);
              }}
            />
            <button
              type="button"
              onClick={handleCnpjLookup}
              disabled={cnpjLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-brand/40 text-brand bg-brand/10 hover:bg-brand/20 disabled:opacity-50 transition-all flex-shrink-0"
            >
              {cnpjLoading ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Buscar
            </button>
          </div>
          {cnpjFeedback && (
            <p className={`text-xs mt-0.5 ${cnpjFeedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
              {cnpjFeedback.msg}
            </p>
          )}
          {errors.contratanteCnpj && (
            <p className="text-xs text-red-400 mt-0.5">{errors.contratanteCnpj.message}</p>
          )}
        </div>

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

        <Input
          label="Site"
          type="url"
          placeholder="https://empresa.com.br"
          error={errors.contratanteSite?.message}
          {...register('contratanteSite')}
        />

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
            Lojas / Estabelecimentos <span className="text-white/30 normal-case font-normal">(opcional)</span>
          </label>
          <textarea
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/50 transition-all resize-none"
            placeholder={"Loja Centro\nLoja Shopping Iguatemi\nLoja Online"}
            rows={3}
            {...register('lojas')}
          />
          <p className="text-xs text-white/30 mt-1">Uma loja por linha. Aparece no contrato como lista de estabelecimentos.</p>
        </div>
      </div>

      {/* Representante Legal */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRepLegal((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white/[0.04] hover:bg-white/[0.07] transition-colors text-left"
        >
          <div>
            <p className="text-sm font-semibold text-white">Representante Legal</p>
            <p className="text-xs text-white/50 mt-0.5">
              Pessoa física que assina em nome do CONTRATANTE — aparece no contrato e na assinatura
            </p>
          </div>
          <span className="text-white/40 text-lg ml-4 flex-shrink-0">{showRepLegal ? '−' : '+'}</span>
        </button>

        {showRepLegal && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-white/[0.08] bg-[#1F1F23]">
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

      <hr className="border-white/[0.06]" />

      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Termos do Contrato</h2>
        <p className="text-sm text-white/50">Vigência, datas e foro</p>
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
