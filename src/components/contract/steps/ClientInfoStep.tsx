'use client';

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Dados do Contratante</h2>
        <p className="text-sm text-gray-500">
          Informações da empresa que vai assinar o contrato como CONTRATANTE
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

      <hr className="border-gray-100" />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Termos do Contrato</h2>
        <p className="text-sm text-gray-500">Vigência, datas e foro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Input
          label="Data de Início"
          required
          placeholder="DD/MM/AAAA"
          error={errors.dataInicio?.message}
          {...register('dataInicio')}
        />

        <Select label="Vigência" required {...register('vigenciaMeses', { valueAsNumber: true })}>
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
