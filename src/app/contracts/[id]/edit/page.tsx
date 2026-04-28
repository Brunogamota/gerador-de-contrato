import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPrisma } from '@/lib/db';
import { ContractData } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { ContractEditWizard } from '@/components/contract/ContractEditWizard';

export const dynamic = 'force-dynamic';

export default async function ContractEditPage({ params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) notFound();

  const contract = await prisma.contract.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!contract) notFound();

  const raw = contract as unknown as Record<string, string>;

  const initialData: ContractData = {
    contratanteNome:     contract.contratanteNome,
    contratanteCnpj:     contract.contratanteCnpj,
    contratanteSite:     raw.contratanteSite     ?? '',
    contratanteEndereco: contract.contratanteEndereco,
    contratanteEmail:    contract.contratanteEmail,
    contratanteTelefone: contract.contratanteTelefone,
    repLegalNome:        contract.repLegalNome     ?? '',
    repLegalCpf:         contract.repLegalCpf      ?? '',
    repLegalRg:          contract.repLegalRg       ?? '',
    repLegalEmail:       contract.repLegalEmail    ?? '',
    repLegalTelefone:    contract.repLegalTelefone ?? '',
    repLegalCargo:       contract.repLegalCargo    ?? '',
    dataInicio:          contract.dataInicio,
    vigenciaMeses:       contract.vigenciaMeses,
    foro:                contract.foro,
    setup:               contract.setup,
    feeTransacao:        contract.feeTransacao,
    taxaAntifraude:      contract.taxaAntifraude,
    taxaPix:             contract.taxaPix,
    taxaPixOut:          contract.taxaPixOut,
    taxaSplit:           contract.taxaSplit,
    taxaEstorno:         contract.taxaEstorno,
    taxaAntecipacao:     contract.taxaAntecipacao,
    limiteAntecipacao:   raw.limiteAntecipacao ?? '100',
    taxa3ds:             raw.taxa3ds           ?? '0.00',
    taxaPreChargeback:   contract.taxaPreChargeback,
    taxaChargeback:      contract.taxaChargeback,
    prazoRecebimento:    contract.prazoRecebimento,
    valorMinimoMensal:   contract.valorMinimoMensal,
  };

  const initialMatrix: MDRMatrix = JSON.parse(contract.mdrMatrix || '{}');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/contracts/${params.id}`}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← {contract.contratanteNome}
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60">Editar</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Editar Contrato</h1>
        <p className="text-sm text-white/40 font-mono mt-1">{contract.contractNumber}</p>
      </div>

      <ContractEditWizard
        contractId={params.id}
        contractNumber={contract.contractNumber}
        initialData={initialData}
        initialMatrix={initialMatrix}
      />
    </div>
  );
}
