import Link from 'next/link';
import { HardNavLink } from '@/components/ui/HardNavLink';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getContracts() {
  const prisma = getPrisma();
  if (!prisma) return [];
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
  draft:  { label: 'Rascunho', color: 'bg-ink-800/50 text-ink-300' },
  active: { label: 'Ativo',    color: 'bg-emerald-950/50 text-emerald-300' },
  signed: { label: 'Assinado', color: 'bg-blue-950/50 text-blue-300' },
};

export const metadata = { title: 'Contratos · RebornPay' };

export default async function ContractsPage() {
  const contracts = await getContracts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Contratos</h1>
          <p className="text-sm text-ink-400 mt-1">{contracts.length} contrato{contracts.length !== 1 ? 's' : ''} no sistema</p>
        </div>
        <HardNavLink
          href="/contracts/new"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
          style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
        >
          + Novo Contrato
        </HardNavLink>
      </div>

      <div className="bg-ink-900 rounded-2xl border border-ink-800 shadow-card overflow-hidden">
        {contracts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-ink-800 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <p className="text-ink-400 text-sm mb-4">Nenhum contrato gerado ainda</p>
            <HardNavLink
              href="/contracts/new"
              className="inline-flex px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
            >
              Criar primeiro contrato
            </HardNavLink>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50 text-xs text-ink-400 uppercase tracking-wide border-b border-ink-800">
              <tr>
                <th className="px-6 py-3 text-left">Contratante</th>
                <th className="px-6 py-3 text-left">Nº Contrato</th>
                <th className="px-6 py-3 text-left">Início</th>
                <th className="px-6 py-3 text-left">Vigência</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {contracts.map((c) => {
                const s = statusMap[c.status] ?? statusMap.draft;
                return (
                  <tr key={c.id} className="hover:bg-ink-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink-50">{c.contratanteNome}</p>
                      <p className="text-xs text-ink-500 font-mono">{c.contratanteCnpj}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-ink-400">{c.contractNumber}</td>
                    <td className="px-6 py-4 text-ink-400">{c.dataInicio}</td>
                    <td className="px-6 py-4 text-ink-400">{c.vigenciaMeses} meses</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      <Link href={`/contracts/${c.id}`} className="text-brand hover:text-brand-400 text-sm font-medium transition-colors">
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
