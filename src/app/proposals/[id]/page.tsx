'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProposalData } from '@/types/proposal';
import { MDRMatrix } from '@/types/pricing';
import { ProposalDocument } from '@/components/proposal/ProposalDocument';
import { exportContractToPdf, printContract } from '@/lib/contract/generator';
import { Button } from '@/components/ui/Button';

type ProposalRecord = {
  id: string;
  proposalNumber: string;
  status: string;
  contractId?: string | null;
  contratanteNome: string;
  contratanteCnpj: string;
  contratanteEndereco: string;
  contratanteEmail: string;
  contratanteTelefone: string;
  repLegalNome?: string | null;
  repLegalCpf?: string | null;
  repLegalRg?: string | null;
  repLegalEmail?: string | null;
  repLegalTelefone?: string | null;
  repLegalCargo?: string | null;
  dataInicio: string;
  vigenciaMeses: number;
  foro: string;
  setup: string;
  feeTransacao: string;
  taxaAntifraude: string;
  taxaPix: string;
  taxaPixOut: string;
  taxaSplit: string;
  taxaEstorno: string;
  taxaAntecipacao: string;
  taxaPreChargeback: string;
  taxaChargeback: string;
  prazoRecebimento: string;
  valorMinimoMensal: string;
  mdrMatrix: string;
  validadeAte: string;
  observacoes?: string | null;
};

const statusMap: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  enviada:  { label: 'Enviada',  color: 'bg-blue-50 text-blue-700' },
  aprovada: { label: 'Aprovada', color: 'bg-emerald-50 text-emerald-700' },
  expirada: { label: 'Expirada', color: 'bg-red-50 text-red-700' },
};

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/proposals/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProposal)
      .catch(() => router.push('/proposals'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleConvert() {
    if (!proposal) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/convert`, { method: 'POST' });
      if (!res.ok) throw new Error('Convert failed');
      const { contractId } = await res.json();
      router.push(`/contracts/${contractId}`);
    } catch {
      alert('Erro ao converter proposta. Tente novamente.');
    } finally {
      setConverting(false);
    }
  }

  async function handleMarkSent() {
    if (!proposal) return;
    setMarkingSent(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'enviada' }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setProposal(updated);
    } catch {
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setMarkingSent(false);
    }
  }

  async function handleExportPdf() {
    if (!proposal) return;
    setExporting(true);
    try {
      await exportContractToPdf('proposal-document', proposal.proposalNumber);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-ink-400 text-sm">Carregando proposta...</p>
      </div>
    );
  }

  if (!proposal) return null;

  const proposalData: ProposalData = {
    contratanteNome:     proposal.contratanteNome,
    contratanteCnpj:     proposal.contratanteCnpj,
    contratanteEndereco: proposal.contratanteEndereco,
    contratanteEmail:    proposal.contratanteEmail,
    contratanteTelefone: proposal.contratanteTelefone,
    repLegalNome:        proposal.repLegalNome     ?? '',
    repLegalCpf:         proposal.repLegalCpf      ?? '',
    repLegalRg:          proposal.repLegalRg       ?? '',
    repLegalEmail:       proposal.repLegalEmail    ?? '',
    repLegalTelefone:    proposal.repLegalTelefone ?? '',
    repLegalCargo:       proposal.repLegalCargo    ?? '',
    dataInicio:          proposal.dataInicio,
    vigenciaMeses:       proposal.vigenciaMeses,
    foro:                proposal.foro,
    setup:               proposal.setup,
    feeTransacao:        proposal.feeTransacao,
    taxaAntifraude:      proposal.taxaAntifraude,
    taxaPix:             proposal.taxaPix,
    taxaPixOut:          proposal.taxaPixOut,
    taxaSplit:           proposal.taxaSplit,
    taxaEstorno:         proposal.taxaEstorno,
    taxaAntecipacao:     proposal.taxaAntecipacao,
    taxaPreChargeback:   proposal.taxaPreChargeback,
    taxaChargeback:      proposal.taxaChargeback,
    prazoRecebimento:    proposal.prazoRecebimento,
    valorMinimoMensal:   proposal.valorMinimoMensal,
    validadeAte:         proposal.validadeAte,
    observacoes:         proposal.observacoes ?? '',
  };

  const mdrMatrix: MDRMatrix = JSON.parse(proposal.mdrMatrix || '{}');
  const s = statusMap[proposal.status] ?? statusMap.rascunho;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/proposals" className="text-sm text-gray-500 hover:text-gray-700">← Propostas</Link>
            <span className="text-gray-300">/</span>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{proposal.contratanteNome}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{proposal.proposalNumber}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => printContract('proposal-document')}>
            Imprimir
          </Button>
          <Button variant="outline" loading={exporting} onClick={handleExportPdf}>
            Exportar PDF
          </Button>
          {proposal.status === 'rascunho' && (
            <Button variant="outline" loading={markingSent} onClick={handleMarkSent}>
              Marcar como Enviada
            </Button>
          )}
          {proposal.status !== 'aprovada' && !proposal.contractId && (
            <Button loading={converting} onClick={handleConvert}>
              Gerar Contrato
            </Button>
          )}
          {proposal.contractId && (
            <Link
              href={`/contracts/${proposal.contractId}`}
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#059669,#065f46)' }}
            >
              Ver Contrato →
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        <ProposalDocument
          proposalData={proposalData}
          mdrMatrix={mdrMatrix}
          proposalNumber={proposal.proposalNumber}
        />
      </div>
    </div>
  );
}
