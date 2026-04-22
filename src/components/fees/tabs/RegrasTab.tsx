'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Rule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: 'protection' | 'optimization' | 'compliance';
}

const DEFAULT_RULES: Rule[] = [
  { id: '1', name: 'Proteção de margem mínima', description: 'Bloqueia taxas abaixo de 0,15% de margem em qualquer faixa', active: true, type: 'protection' },
  { id: '2', name: 'Progressão obrigatória', description: 'Taxa de 12x deve ser sempre maior que 6x (evita inconsistência)', active: true, type: 'protection' },
  { id: '3', name: 'Amex com spread extra', description: 'Aplica +0,80% de spread sobre Amex em relação a Visa/MC', active: true, type: 'optimization' },
  { id: '4', name: 'Pix com teto de 1,20%', description: 'Taxa de Pix nunca ultrapassa 1,20% para manter competitividade', active: false, type: 'compliance' },
  { id: '5', name: 'Ajuste automático por volume', description: 'Reduz taxa em 0,05% para clientes com volume > R$ 5M/mês', active: false, type: 'optimization' },
];

const TYPE_COLORS = {
  protection:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    label: 'Proteção'    },
  optimization: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'Otimização' },
  compliance:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   label: 'Compliance'  },
};

export function RegrasTab() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);

  function toggle(id: string) {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  }

  const activeCount = rules.filter((r) => r.active).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Regras e Estratégia de Pricing</h3>
          <p className="text-xs text-white/40 mt-0.5">{activeCount} de {rules.length} regras ativas</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova regra
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {rules.map((rule) => {
          const typeStyle = TYPE_COLORS[rule.type];
          return (
            <div
              key={rule.id}
              className={cn(
                'flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all',
                rule.active
                  ? 'bg-white/[0.02] border-white/[0.06]'
                  : 'bg-transparent border-white/[0.03] opacity-50',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md border uppercase tracking-wider', typeStyle.bg, typeStyle.border, typeStyle.text)}>
                    {typeStyle.label}
                  </span>
                  <span className="text-sm font-medium text-white/85 truncate">{rule.name}</span>
                </div>
                <p className="text-xs text-white/40 truncate">{rule.description}</p>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(rule.id)}
                className={cn(
                  'relative w-10 h-5.5 rounded-full transition-all shrink-0',
                  rule.active ? 'bg-brand' : 'bg-white/10',
                )}
                style={{ height: '22px', width: '40px' }}
              >
                <div className={cn(
                  'absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all',
                  rule.active ? 'left-[18px]' : 'left-0.5',
                )} style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Strategy profile summary */}
      <div className="bg-[#111113] rounded-xl border border-white/[0.06] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35 mb-3">Resumo da estratégia ativa</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-white/35 mb-1">Proteção</p>
            <p className="text-lg font-bold text-white">{rules.filter((r) => r.active && r.type === 'protection').length}/{rules.filter((r) => r.type === 'protection').length}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/35 mb-1">Otimização</p>
            <p className="text-lg font-bold text-emerald-400">{rules.filter((r) => r.active && r.type === 'optimization').length}/{rules.filter((r) => r.type === 'optimization').length}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/35 mb-1">Compliance</p>
            <p className="text-lg font-bold text-amber-400">{rules.filter((r) => r.active && r.type === 'compliance').length}/{rules.filter((r) => r.type === 'compliance').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
