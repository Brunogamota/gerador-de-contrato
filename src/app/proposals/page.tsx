import Link from 'next/link';
import { HardNavLink } from '@/components/ui/HardNavLink';
import { getPrisma } from '@/lib/db';
import { PROPOSAL_STATUS_LABELS, ProposalStatus } from '@/types/proposal';

export const dynamic = 'force-dynamic';

async function getProposals() {
  const prisma = getPrisma();
  if (!prisma) return [];
  try {
    return await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        proposalNumber: true,
        contratanteNome: true,
        contratanteCnpj: true,
        status: true,
        validadeAte: true,
        contractId: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}


export const metadata = { title: 'Propostas · RebornPay' };

export default async function ProposalsPage() {
  const proposals = await getProposals();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Propostas</h1>
          <p className="text-sm text-ink-400 mt-1">
            {proposals.length} proposta{proposals.length !== 1 ? 's' : ''} no sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HardNavLink
            href="/proposals/new?tipo=intl"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)' }}
          >
            🌐 + Internacional
          </HardNavLink>
          <HardNavLink
            href="/proposals/new"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
            style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
          >
            + Nova Proposta
          </HardNavLink>
        </div>
      </div>

      <div className="bg-ink-900 rounded-2xl border border-ink-800 shadow-card overflow-hidden">
        {proposals.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-ink-800 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-ink-400 text-sm mb-4">Nenhuma proposta criada ainda</p>
            <HardNavLink
              href="/proposals/new"
              className="inline-flex px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
            >
              Criar primeira proposta
            </HardNavLink>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50 text-xs text-ink-400 uppercase tracking-wide border-b border-ink-800">
              <tr>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Nº Proposta</th>
                <th className="px-6 py-3 text-left">Validade</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {proposals.map((p) => {
                const s = PROPOSAL_STATUS_LABELS[p.status as ProposalStatus] ?? PROPOSAL_STATUS_LABELS.draft;
                return (
                  <tr key={p.id} className="hover:bg-ink-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink-50">{p.contratanteNome}</p>
                      <p className="text-xs text-ink-500 font-mono">{p.contratanteCnpj}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-ink-400">{p.proposalNumber}</td>
                    <td className="px-6 py-4 text-ink-400">{p.validadeAte}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {p.contractId && (
                          <Link
                            href={`/contracts/${p.contractId}`}
                            className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors"
                          >
                            Contrato
                          </Link>
                        )}
                        <Link
                          href={`/proposals/${p.id}/edit`}
                          className="text-sky-400 hover:text-sky-300 text-xs font-medium transition-colors"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/proposals/${p.id}`}
                          className="text-brand hover:text-brand-400 text-sm font-medium transition-colors"
                        >
                          Ver
                        </Link>
                      </div>
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
