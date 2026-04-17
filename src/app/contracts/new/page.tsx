import { ContractWizard } from '@/components/contract/ContractWizard';

export const metadata = { title: 'Novo Contrato · RebornPay' };

export default function NewContractPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Contrato</h1>
        <p className="text-sm text-gray-500 mt-1">
          Preencha os dados, configure o MDR e gere o contrato completo
        </p>
      </div>
      <ContractWizard />
    </div>
  );
}
