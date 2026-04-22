'use client';

const HISTORY = [
  { id: '1', date: '21/04/2026', time: '15:47', user: 'Rafael T.', action: 'Override aplicado', detail: 'Visa 12x: 4,99% → 5,19%', type: 'override' },
  { id: '2', date: '21/04/2026', time: '14:22', user: 'Rafael T.', action: 'Sugestão do Copilot aplicada', detail: 'Estratégia agressiva e-commerce (5 ajustes)', type: 'copilot' },
  { id: '3', date: '20/04/2026', time: '11:05', user: 'Rafael T.', action: 'Perfil alterado', detail: 'Enterprise Padrão → Competitive Plus', type: 'profile' },
  { id: '4', date: '19/04/2026', time: '16:30', user: 'Sistema',   action: 'Tabela recalculada', detail: 'Atualização automática de custos Dock', type: 'system' },
  { id: '5', date: '18/04/2026', time: '09:12', user: 'Rafael T.', action: 'Override resetado', detail: 'Mastercard 1x: revertido para padrão', type: 'reset' },
];

const TYPE_STYLES: Record<string, { dot: string; badge: string; text: string; label: string }> = {
  override: { dot: 'bg-brand',        badge: 'bg-brand/10 border-brand/20 text-brand',                 text: 'text-brand',        label: 'Override'  },
  copilot:  { dot: 'bg-purple-400',   badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400',  text: 'text-purple-400',   label: 'Copilot'   },
  profile:  { dot: 'bg-blue-400',     badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',        text: 'text-blue-400',     label: 'Perfil'    },
  system:   { dot: 'bg-white/30',     badge: 'bg-white/5 border-white/10 text-white/40',               text: 'text-white/40',     label: 'Sistema'   },
  reset:    { dot: 'bg-amber-400',    badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',     text: 'text-amber-400',    label: 'Reset'     },
};

export function HistoricoTab() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Histórico de Alterações</h3>
        <p className="text-xs text-white/40 mt-0.5">Todas as mudanças realizadas na tabela de taxas.</p>
      </div>

      <div className="flex flex-col">
        {HISTORY.map((entry, i) => {
          const style = TYPE_STYLES[entry.type];
          return (
            <div key={entry.id} className="flex gap-4 pb-5 last:pb-0">
              {/* Timeline */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${style.dot}`} />
                {i < HISTORY.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${style.badge}`}>
                      {style.label}
                    </span>
                    <span className="text-sm font-medium text-white/80">{entry.action}</span>
                  </div>
                  <span className="text-[10px] text-white/25 shrink-0 mt-0.5">{entry.time}</span>
                </div>
                <p className="text-xs text-white/45 mt-1">{entry.detail}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{entry.date} · {entry.user}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors text-center">
        Ver histórico completo →
      </button>
    </div>
  );
}
