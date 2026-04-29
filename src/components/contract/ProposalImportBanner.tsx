'use client';

import { useState } from 'react';
import { ContractData } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';

interface ProposalOption {
  id: string;
  proposalNumber: string;
  contratanteNome: string;
  contratanteCnpj: string;
  status: string;
  validadeAte: string;
}

interface Props {
  onImport: (data: ContractData, mdrMatrix: MDRMatrix) => void;
}

const STATUS_LABEL: Record<string, string> = {
  draft:                  'Rascunho',
  generated:              'Gerada',
  sent:                   'Enviada',
  viewed:                 'Visualizada',
  accepted:               'Aceita',
  converted_to_contract:  'Convertida',
};

export function ProposalImportBanner({ onImport }: Props) {
  const [open, setOpen]           = useState(false);
  const [proposals, setProposals] = useState<ProposalOption[]>([]);
  const [loading, setLoading]     = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported]   = useState<string | null>(null);
  const [search, setSearch]       = useState('');

  async function openPicker() {
    setOpen(true);
    if (proposals.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/proposals');
      const data: ProposalOption[] = await res.json();
      setProposals(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(p: ProposalOption) {
    setImporting(p.id);
    try {
      const res = await fetch(`/api/proposals/${p.id}`);
      const raw = await res.json() as Record<string, unknown>;

      const str = (k: string, fallback = '') => (raw[k] as string | null | undefined) ?? fallback;
      const num = (k: string, fallback: number) => {
        const v = raw[k];
        return typeof v === 'number' ? v : fallback;
      };

      const contractData: ContractData = {
        contratanteNome:      str('contratanteNome'),
        contratanteCnpj:      str('contratanteCnpj'),
        contratanteSite:      str('contratanteSite'),
        contratanteEndereco:  str('contratanteEndereco'),
        contratanteEmail:     str('contratanteEmail'),
        contratanteTelefone:  str('contratanteTelefone'),
        repLegalNome:         str('repLegalNome'),
        repLegalCpf:          str('repLegalCpf'),
        repLegalRg:           str('repLegalRg'),
        repLegalEmail:        str('repLegalEmail'),
        repLegalTelefone:     str('repLegalTelefone'),
        repLegalCargo:        str('repLegalCargo'),
        dataInicio:           '',
        vigenciaMeses:        num('vigenciaMeses', 12),
        foro:                 str('foro', 'São Paulo/SP'),
        setup:                str('setup', '0.00'),
        feeTransacao:         str('feeTransacao', '0.15'),
        taxaAntifraude:       str('taxaAntifraude', '1.00'),
        taxaPix:              str('taxaPix', '0.45'),
        taxaPixOut:           str('taxaPixOut', '0.45'),
        taxaSplit:            str('taxaSplit', '0.00'),
        taxaEstorno:          str('taxaEstorno', '2.50'),
        taxaAntecipacao:      str('taxaAntecipacao', '1.45'),
        limiteAntecipacao:    str('limiteAntecipacao', '100'),
        taxa3ds:              str('taxa3ds', '0.00'),
        taxaPreChargeback:    str('taxaPreChargeback', '0.00'),
        taxaChargeback:       str('taxaChargeback', '65.00'),
        prazoRecebimento:     str('prazoRecebimento', 'D0'),
        valorMinimoMensal:    str('valorMinimoMensal', '0.00'),
        lojas:                str('lojas'),
        volumeAnualNegociado: str('volumeAnualNegociado'),
      };

      const mdrMatrix: MDRMatrix = JSON.parse(str('mdrMatrix', '{}'));

      onImport(contractData, mdrMatrix);
      setImported(p.contratanteNome);
      setOpen(false);
      setSearch('');
    } finally {
      setImporting(null);
    }
  }

  const filtered = proposals.filter(
    (p) =>
      p.contratanteNome.toLowerCase().includes(search.toLowerCase()) ||
      p.proposalNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.contratanteCnpj.includes(search),
  );

  if (imported) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-300">
            Dados importados de <span className="font-semibold">{imported}</span>.
            {' '}<span className="text-emerald-400/70">Preencha a Data de Início e confira.</span>
          </p>
        </div>
        <button
          onClick={() => { setImported(null); setProposals([]); }}
          className="text-xs text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
        >
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-white/20 bg-white/[0.03] hover:bg-white/[0.06] hover:border-brand/40 transition-all text-left group"
      >
        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand/20 transition-colors">
          <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
            Importar dados de uma proposta existente
          </p>
          <p className="text-xs text-white/30">Cliente, taxas e tabela MDR são preenchidos automaticamente</p>
        </div>
        <svg className="w-4 h-4 text-white/20 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente ou número..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
              />
              <button
                onClick={() => { setOpen(false); setSearch(''); }}
                className="text-white/30 hover:text-white/60 transition-colors text-xs px-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-white/30">Carregando propostas…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-white/30">
                  {proposals.length === 0 ? 'Nenhuma proposta encontrada.' : 'Nenhum resultado para a busca.'}
                </p>
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={importing === p.id}
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.06] transition-colors text-left border-b border-white/[0.04] last:border-0 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.contratanteNome}</p>
                    <p className="text-xs text-white/35 font-mono">{p.proposalNumber} · {p.contratanteCnpj}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs text-white/30">{STATUS_LABEL[p.status] ?? p.status}</span>
                    {importing === p.id ? (
                      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-brand text-xs font-semibold">Usar →</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
