import Link from 'next/link';
import { prisma } from '@/lib/db';

async function getContracts() {
  try {
    return await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        contractNumber: true,
        contratanteNome: true,
        contratanteCnpj: true,
        status: true,
        dataInicio: true,
        vigenciaMeses: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}

const statusMap: Record<string, { label: string; color: string }> = {
  draft:  { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Ativo',    color: 'bg-emerald-50 text-emerald-700' },
  signed: { label: 'Assinado', color: 'bg-blue-50 text-blue-700' },
};

export const metadata = { title: 'Contratos · RebornPay' };

export default async function ContractsPage() {
  const contracts = await getContracts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500 mt-1">{contracts.length} contrato{contracts.length !== 1 ? 's' : ''} no sistema</p>
        </div>
        <Link
          href="/contracts/new"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
        >
          + Novo Contrato
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        {contracts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <p className="text-gray-500 text-sm mb-4">Nenhum contrato gerado ainda</p>
            <Link
              href="/contracts/new"
              className="inline-flex px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              Criar primeiro contrato
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Contratante</th>
                <th className="px-6 py-3 text-left">Nº Contrato</th>
                <th className="px-6 py-3 text-left">Início</th>
                <th className="px-6 py-3 text-left">Vigência</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => {
                const s = statusMap[c.status] ?? statusMap.draft;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{c.contratanteNome}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.contratanteCnpj}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{c.contractNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{c.dataInicio}</td>
                    <td className="px-6 py-4 text-gray-600">{c.vigenciaMeses} meses</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      <Link href={`/contracts/${c.id}`} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
