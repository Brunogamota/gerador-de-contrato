'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { FeesTable } from '@/lib/fees/pricingViewModel';
import { PRICING_BRANDS, TABLE_INSTALLMENTS } from '@/lib/fees/pricingViewModel';

interface Props {
  table: FeesTable;
}

const MIX_PRESETS = [
  { label: 'Alto parcelamento', vista: 15, mid: 25, long: 60 },
  { label: 'Varejo (balanceado)', vista: 35, mid: 40, long: 25 },
  { label: 'Serviços (à vista)', vista: 60, mid: 30, long: 10 },
];

export function SimuladorTab({ table }: Props) {
  const [volume, setVolume]  = useState('1850000');
  const [mixPreset, setMixPreset] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const mix = MIX_PRESETS[mixPreset];
  const vol = parseFloat(volume.replace(/\D/g, '')) || 1000000;

  const result = useMemo(() => {
    const instWeight: Partial<Record<number, number>> = {
      1:  (mix.vista / 100),
      2:  (mix.mid / 100) * 0.4,
      3:  (mix.mid / 100) * 0.3,
      4:  (mix.mid / 100) * 0.2,
      6:  (mix.mid / 100) * 0.1,
      9:  (mix.long / 100) * 0.4,
      12: (mix.long / 100) * 0.6,
    };

    let totalRevenue = 0;
    let totalCost = 0;
    const rows: { label: string; revenue: number; margin: number }[] = [];

    for (const brand of PRICING_BRANDS) {
      let brandRevenue = 0;
      let brandCost = 0;
      const brandVol = vol * (brand === 'pix' ? 0.12 : 0.176); // rough split

      for (const inst of TABLE_INSTALLMENTS) {
        const cell = table[brand][inst];
        if (!cell) continue;
        const w = instWeight[inst] ?? 0;
        brandRevenue += (cell.rate / 100) * brandVol * w;
        brandCost    += (cell.cost / 100) * brandVol * w;
      }
      const margin = brandRevenue - brandCost;
      if (brandRevenue > 0) {
        rows.push({
          label: brand.charAt(0).toUpperCase() + brand.slice(1),
          revenue: Math.round(brandRevenue),
          margin: Math.round(margin),
        });
      }
      totalRevenue += brandRevenue;
      totalCost    += brandCost;
    }

    return {
      totalRevenue: Math.round(totalRevenue),
      totalMargin:  Math.round(totalRevenue - totalCost),
      marginPct:    parseFloat(((totalRevenue - totalCost) / totalRevenue * 100).toFixed(2)),
      rows,
    };
  }, [vol, mix, table]);

  const cur = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

  function formatVolumeInput(raw: string) {
    const digits = raw.replace(/\D/g, '');
    return digits ? new Intl.NumberFormat('pt-BR').format(parseInt(digits)) : '';
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-white">Simulador de Impacto</h3>
        <p className="text-xs text-white/40 mt-0.5">Estime o impacto financeiro da tabela atual em diferentes cenários de volume.</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Volume mensal (R$)</label>
          <input
            type="text"
            value={formatVolumeInput(volume)}
            onChange={(e) => setVolume(e.target.value.replace(/\D/g, ''))}
            className="px-3 py-2.5 rounded-xl border border-white/[0.09] bg-white/[0.03] text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
            placeholder="1.850.000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Perfil de mix</label>
          <select
            value={mixPreset}
            onChange={(e) => setMixPreset(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-white/[0.09] bg-[#0c0c0d] text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
          >
            {MIX_PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mix breakdown */}
      <div className="flex gap-3">
        <div className="flex-1 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <p className="text-[10px] text-white/35 mb-2 uppercase tracking-widest font-semibold">Mix de transações</p>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-2">
            <div className="rounded-l-full bg-blue-500 transition-all" style={{ width: `${mix.vista}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${mix.mid}%` }} />
            <div className="rounded-r-full bg-emerald-500 transition-all" style={{ width: `${mix.long}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-white/40">
            <span>{mix.vista}% à vista</span>
            <span>{mix.mid}% curto</span>
            <span>{mix.long}% longo</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111113] rounded-xl border border-white/[0.06] p-4">
          <p className="text-[10px] text-white/35 mb-1 uppercase tracking-widest font-semibold">Receita total</p>
          <p className="text-lg font-bold text-white">{cur(result.totalRevenue)}</p>
          <p className="text-[11px] text-white/35 mt-0.5">Bruta mensal</p>
        </div>
        <div className="bg-[#111113] rounded-xl border border-emerald-500/15 p-4">
          <p className="text-[10px] text-white/35 mb-1 uppercase tracking-widest font-semibold">Margem líquida</p>
          <p className="text-lg font-bold text-emerald-400">{cur(result.totalMargin)}</p>
          <p className="text-[11px] text-emerald-400/50 mt-0.5">{result.marginPct}% do volume</p>
        </div>
        <div className="bg-[#111113] rounded-xl border border-white/[0.06] p-4">
          <p className="text-[10px] text-white/35 mb-1 uppercase tracking-widest font-semibold">Volume simulado</p>
          <p className="text-lg font-bold text-white">{cur(vol)}</p>
          <p className="text-[11px] text-white/35 mt-0.5">Base de cálculo</p>
        </div>
      </div>

      {/* Per-brand breakdown */}
      <div>
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors flex items-center gap-1"
        >
          {showBreakdown ? 'Ocultar' : 'Ver'} breakdown por bandeira
          <svg className={cn('w-3 h-3 transition-transform', showBreakdown && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showBreakdown && (
          <div className="mt-3 flex flex-col gap-2">
            {result.rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/[0.05] bg-white/[0.015]">
                <span className="text-sm font-medium text-white/70">{row.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-white/40">{cur(row.revenue)}</span>
                  <span className="text-xs font-mono font-semibold text-emerald-400">{cur(row.margin)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
