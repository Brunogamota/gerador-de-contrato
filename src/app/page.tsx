import Link from 'next/link';
import { prisma } from '@/lib/db';

async function getStats() {
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
  draft:  { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Ativo',    color: 'bg-emerald-50 text-emerald-700' },
  signed: { label: 'Assinado', color: 'bg-blue-50 text-blue-700' },
};

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecent()]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie contratos e tabelas de pricing</p>
        </div>
        <Link
          href="/contracts/new"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
        >
          + Novo Contrato
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Contratos', value: stats.total, icon: '📄' },
          { label: 'Rascunhos',          value: stats.draft,  icon: '✏️' },
          { label: 'Ativos',             value: stats.active, icon: '✅' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-card p-5 flex items-center gap-4">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent contracts */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Contratos Recentes</h2>
          <Link href="/contracts" className="text-sm text-brand-600 hover:text-brand-700">
            Ver todos →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm mb-4">Nenhum contrato gerado ainda</p>
            <Link
              href="/contracts/new"
              className="inline-flex px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              Criar primeiro contrato
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Contratante</th>
                <th className="px-6 py-3 text-left">Nº Contrato</th>
                <th className="px-6 py-3 text-left">Data Início</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((c) => {
                const s = statusLabel[c.status] ?? statusLabel.draft;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{c.contratanteNome}</p>
                      <p className="text-xs text-gray-500">{c.contratanteCnpj}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{c.contractNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{c.dataInicio}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/contracts/${c.id}`} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
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
          <div key={card.title} className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-900">{card.title}</h3>
            <p className="text-sm text-gray-500 flex-1">{card.desc}</p>
            <Link href={card.href} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              {card.cta} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
