import Link from 'next/link';
import { HardNavLink } from '@/components/ui/HardNavLink';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getStats() {
  const prisma = getPrisma();
  if (!prisma) return { total: 0, draft: 0, active: 0 };
  try {
    const [total, draft, active] = await Promise.all([
      prisma.contract.count(),
      prisma.contract.count({ where: { status: 'draft' } }),
      prisma.contract.count({ where: { status: 'active' } }),
    ]);
    return { total, draft, active };
  } catch {
    return { total: 0, draft: 0, active: 0 };
  }
}

async function getRecent() {
  const prisma = getPrisma();
  if (!prisma) return [];
  try {
    return await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        contractNumber: true,
        contratanteNome: true,
        contratanteCnpj: true,
        status: true,
        dataInicio: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}

const statusLabel: Record<string, { label: string; color: string }> = {
  draft:  { label: 'Rascunho', color: 'bg-ink-800/50 text-ink-300' },
  active: { label: 'Ativo',    color: 'bg-emerald-950/50 text-emerald-300' },
  signed: { label: 'Assinado', color: 'bg-blue-950/50 text-blue-300' },
};

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecent()]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Dashboard</h1>
          <p className="text-sm text-ink-400 mt-1">Gerencie contratos e tabelas de pricing</p>
        </div>
        <HardNavLink
          href="/contracts/new"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
          style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
        >
          + Novo Contrato
        </HardNavLink>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Contratos', value: stats.total, icon: '📄' },
          { label: 'Rascunhos',          value: stats.draft,  icon: '✏️' },
          { label: 'Ativos',             value: stats.active, icon: '✅' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-ink-900 rounded-2xl border border-ink-800 shadow-card p-5 flex items-center gap-4">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-2xl font-bold text-ink-50">{value}</p>
              <p className="text-sm text-ink-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent contracts */}
      <div className="bg-ink-900 rounded-2xl border border-ink-800 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-800 flex items-center justify-between">
          <h2 className="font-semibold text-ink-50">Contratos Recentes</h2>
          <Link href="/contracts" className="text-sm text-brand hover:text-brand-400 transition-colors">
            Ver todos →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-ink-500 text-sm mb-4">Nenhum contrato gerado ainda</p>
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
            <thead className="bg-ink-800/50 text-xs text-ink-400 uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Contratante</th>
                <th className="px-6 py-3 text-left">Nº Contrato</th>
                <th className="px-6 py-3 text-left">Data Início</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {recent.map((c) => {
                const s = statusLabel[c.status] ?? statusLabel.draft;
                return (
                  <tr key={c.id} className="hover:bg-ink-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink-50">{c.contratanteNome}</p>
                      <p className="text-xs text-ink-500">{c.contratanteCnpj}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-ink-400">{c.contractNumber}</td>
                    <td className="px-6 py-4 text-ink-400">{c.dataInicio}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/contracts/${c.id}`} className="text-brand hover:text-brand-400 text-sm font-medium transition-colors">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Engine MDR',
            desc: 'Tabela de taxas por bandeira e parcela com cálculo automático de MDR Final = Base + Antecipação.',
            href: '/contracts/new',
            cta: 'Criar pricing',
          },
          {
            title: 'Validação de Consistência',
            desc: 'Detecta progressão invertida, taxas incomuns e campos faltantes em tempo real.',
            href: '/contracts/new',
            cta: 'Ver validações',
          },
          {
            title: 'Geração de Contrato',
            desc: 'Contrato completo com todos os dados e MDR injetados automaticamente. Exporta em PDF.',
            href: '/contracts/new',
            cta: 'Gerar contrato',
          },
        ].map((card) => (
          <div key={card.title} className="bg-ink-900 rounded-2xl border border-ink-800 shadow-card p-6 flex flex-col gap-3">
            <h3 className="font-semibold text-ink-50">{card.title}</h3>
            <p className="text-sm text-ink-400 flex-1">{card.desc}</p>
            <HardNavLink href={card.href} className="text-sm font-medium text-brand hover:text-brand-400 transition-colors">
              {card.cta} →
            </HardNavLink>
          </div>
        ))}
      </div>
    </div>
  );
}
