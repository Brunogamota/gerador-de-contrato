import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPrisma } from '@/lib/db';
import { MDRMatrix } from '@/types/pricing';
import { ContractDocument } from '@/components/contract/ContractDocument';
import { ContractData } from '@/types/contract';
import { PrintButton } from '@/components/contract/PrintButton';
import { SignaturePanel } from '@/components/contract/SignaturePanel';

export const dynamic = 'force-dynamic';

async function getContract(id: string) {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    return await prisma.contract.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const contract = await getContract(params.id);
  if (!contract) notFound();

  const contractData: ContractData = {
    contratanteNome: contract.contratanteNome,
    contratanteCnpj: contract.contratanteCnpj,
    contratanteEndereco: contract.contratanteEndereco,
    contratanteEmail: contract.contratanteEmail,
    contratanteTelefone: contract.contratanteTelefone,
    repLegalNome:     contract.repLegalNome     ?? '',
    repLegalCpf:      contract.repLegalCpf      ?? '',
    repLegalRg:       contract.repLegalRg       ?? '',
    repLegalEmail:    contract.repLegalEmail     ?? '',
    repLegalTelefone: contract.repLegalTelefone ?? '',
    repLegalCargo:    contract.repLegalCargo    ?? '',
    dataInicio: contract.dataInicio,
    vigenciaMeses: contract.vigenciaMeses,
    foro: contract.foro,
    setup: contract.setup,
    feeTransacao: contract.feeTransacao,
    taxaAntifraude: contract.taxaAntifraude,
    taxaPix: contract.taxaPix,
    taxaPixOut: contract.taxaPixOut,
    taxaSplit: contract.taxaSplit,
    taxaEstorno: contract.taxaEstorno,
    taxaAntecipacao: contract.taxaAntecipacao,
    taxaPreChargeback: contract.taxaPreChargeback,
    taxaChargeback: contract.taxaChargeback,
    prazoRecebimento: contract.prazoRecebimento,
    valorMinimoMensal: contract.valorMinimoMensal,
  };

  const mdrMatrix: MDRMatrix = JSON.parse(contract.mdrMatrix || '{}');

  const zapSignStatus = (contract as Record<string, unknown>).zapSignStatus as string | null | undefined;
  const zapSignSigners = (contract as Record<string, unknown>).zapSignSigners as string | null | undefined;
  const sentForSignatureAt = (contract as Record<string, unknown>).sentForSignatureAt as Date | null | undefined;
  const signedAt = (contract as Record<string, unknown>).signedAt as Date | null | undefined;

  const statusMap: Record<string, { label: string; color: string }> = {
    draft:  { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
    active: { label: 'Ativo',    color: 'bg-emerald-50 text-emerald-700' },
    signed: { label: 'Assinado', color: 'bg-blue-50 text-blue-700' },
  };
  const s = statusMap[contract.status] ?? statusMap.draft;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/contracts" className="text-sm text-gray-500 hover:text-gray-700">← Contratos</Link>
            <span className="text-gray-300">/</span>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{contract.contratanteNome}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{contract.contractNumber}</p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
        </div>
      </div>

      {/* Signature panel */}
      <SignaturePanel
        contractId={contract.id}
        contractNumber={contract.contractNumber}
        clientName={contract.contratanteNome}
        clientEmail={contract.contratanteEmail}
        repName={contract.repLegalNome ?? undefined}
        repEmail={contract.repLegalEmail ?? undefined}
        zapSignStatus={zapSignStatus}
        zapSignSigners={zapSignSigners}
        sentForSignatureAt={sentForSignatureAt}
        signedAt={signedAt}
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        <ContractDocument
          contractData={contractData}
          mdrMatrix={mdrMatrix}
          contractNumber={contract.contractNumber}
        />
      </div>
    </div>
  );
}
