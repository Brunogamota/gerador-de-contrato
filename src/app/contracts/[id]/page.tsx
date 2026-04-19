import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { MDRMatrix } from '@/types/pricing';
import { ContractDocument } from '@/components/contract/ContractDocument';
import { ContractData } from '@/types/contract';

async function getContract(id: string) {
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
    dataInicio: contract.dataInicio,
    vigenciaMeses: contract.vigenciaMeses,
    foro: contract.foro,
    setup: contract.setup,
    setupParcelas: (contract as any).setupParcelas ?? 1,
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
    isencaoFeeAteMeses: (contract as any).isencaoFeeAteMeses ?? 0,
  };

  const mdrMatrix: MDRMatrix = JSON.parse(contract.mdrMatrix || '{}');

  const statusMap: Record<string, { label: string; color: string }> = {
    draft:  { label: 'Rascunho', color: 'bg-ink-800/60 text-ink-300 ring-1 ring-ink-700' },
    active: { label: 'Ativo',    color: 'bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-900' },
    signed: { label: 'Assinado', color: 'bg-blue-950/60 text-blue-300 ring-1 ring-blue-900' },
  };
  const s = statusMap[contract.status] ?? statusMap.draft;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/contracts" className="text-sm text-ink-400 hover:text-ink-200 transition-colors">← Contratos</Link>
            <span className="text-ink-700">/</span>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
          </div>
          <h1 className="text-2xl font-bold text-ink-50">{contract.contratanteNome}</h1>
          <p className="text-sm text-ink-400 font-mono mt-1">{contract.contractNumber}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-ink-700 bg-ink-800 text-ink-200 hover:bg-ink-700 hover:text-ink-50 transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>

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
