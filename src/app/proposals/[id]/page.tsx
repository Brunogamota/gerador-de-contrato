'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProposalData, PROPOSAL_STATUS_LABELS, ProposalStatus } from '@/types/proposal';
import { MDRMatrix, BRANDS, BRAND_LABELS, INSTALLMENTS, BrandName, InstallmentNumber, IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { MarginConfig } from '@/lib/pricing/margin';
import { computeMarginBreakdown, applyMargin } from '@/lib/pricing/margin';
import { ProposalDocument } from '@/components/proposal/ProposalDocument';
import { exportContractToPdf, printContract } from '@/lib/contract/generator';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
  costTable: string;
  marginConfig: string;
  clientRates: string;
  intlProposalPricing?: string | null;
  setupIntl?: string | null;
  mcc?: string | null;
  tipoMercado?: string | null;
  validadeAte: string;
  observacoes?: string | null;
};

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showInternal, setShowInternal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/proposals/${params.id}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProposal)
      .catch((err) => { if (err?.name !== 'AbortError') router.push('/proposals'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
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

  async function patchStatus(status: string, extra?: Record<string, unknown>) {
    if (!proposal) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setProposal(updated);
    } catch {
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setUpdatingStatus(false);
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
    contratanteSite:     (proposal as unknown as Record<string, string>).contratanteSite ?? '',
    contratanteEndereco: proposal.contratanteEndereco,
    contratanteEmail:    proposal.contratanteEmail,
    contratanteTelefone: proposal.contratanteTelefone,
    repLegalNome:        proposal.repLegalNome     ?? '',
    repLegalCpf:         proposal.repLegalCpf      ?? '',
    repLegalRg:          proposal.repLegalRg       ?? '',
    repLegalEmail:       proposal.repLegalEmail    ?? '',
    repLegalTelefone:    proposal.repLegalTelefone ?? '',
    repLegalCargo:       proposal.repLegalCargo    ?? '',
    dataInicio:          '',
    vigenciaMeses:       12,
    foro:                'São Paulo/SP',
    setup:               proposal.setup,
    feeTransacao:        proposal.feeTransacao,
    taxaAntifraude:      proposal.taxaAntifraude,
    taxaPix:             proposal.taxaPix,
    taxaPixOut:          proposal.taxaPixOut,
    taxaSplit:           proposal.taxaSplit,
    taxaEstorno:         proposal.taxaEstorno,
    taxaAntecipacao:     proposal.taxaAntecipacao,
    limiteAntecipacao:   (proposal as unknown as Record<string, string>).limiteAntecipacao ?? '100',
    taxa3ds:             (proposal as unknown as Record<string, string>).taxa3ds           ?? '0.00',
    taxaPreChargeback:   proposal.taxaPreChargeback,
    taxaChargeback:      proposal.taxaChargeback,
    prazoRecebimento:    proposal.prazoRecebimento,
    valorMinimoMensal:   proposal.valorMinimoMensal,
    lojas:               (proposal as unknown as Record<string, string>).lojas                ?? '',
    volumeAnualNegociado:(proposal as unknown as Record<string, string>).volumeAnualNegociado ?? '',
    mcc:                 proposal.mcc          ?? '',
    tipoMercado:         (proposal.tipoMercado as 'brasil' | 'intl' | 'both') ?? 'brasil',
    validadeAte:         proposal.validadeAte,
    observacoes:         proposal.observacoes ?? '',
  };

  const mdrMatrix: MDRMatrix = (() => {
    try { return JSON.parse(proposal.mdrMatrix || '') as MDRMatrix; } catch { return createEmptyMatrix(); }
  })();
  const costTable: MDRMatrix = (() => {
    try { return JSON.parse(proposal.costTable || '') as MDRMatrix; } catch { return createEmptyMatrix(); }
  })();
  const clientRates: MDRMatrix = (() => {
    try { return JSON.parse(proposal.clientRates || '') as MDRMatrix; } catch { return createEmptyMatrix(); }
  })();
  const marginConfig: MarginConfig = (() => {
    try { return JSON.parse(proposal.marginConfig || '{}'); } catch { return { type: 'percent', value: '0' }; }
  })();
  const finalMatrix = applyMargin(costTable, marginConfig);
  const intlProposalPricing: IntlPricing = (() => {
    try { return JSON.parse(proposal.intlProposalPricing || '{}'); } catch { return DEFAULT_INTL_PRICING; }
  })();
  const setupIntl = proposal.setupIntl || '0.00';

  const status = proposal.status as ProposalStatus;
  const statusInfo = PROPOSAL_STATUS_LABELS[status] ?? PROPOSAL_STATUS_LABELS.draft;
  const isConverted = proposal.status === 'converted_to_contract';
  const hasCostData = Object.keys(costTable).length > 0;
  const hasClientRates = Object.values(clientRates).some(
    (brand) => typeof brand === 'object' && brand !== null &&
      Object.values(brand as object).some((e: unknown) => (e as { mdrBase?: string })?.mdrBase),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/proposals" className="text-sm text-white/40 hover:text-white/70 transition-colors">← Propostas</Link>
            <span className="text-white/20">/</span>
            <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>
              {statusInfo.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{proposal.contratanteNome}</h1>
          <p className="text-sm text-white/40 font-mono mt-1">{proposal.proposalNumber}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/proposals/${proposal.id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 hover:border-ink-300 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Link>
          <Button variant="outline" onClick={() => printContract('proposal-document')}>
            Imprimir
          </Button>
          <Button variant="outline" loading={exporting} onClick={handleExportPdf}>
            Exportar PDF
          </Button>

          {/* Status actions */}
          {proposal.status === 'draft' && (
            <Button variant="outline" loading={updatingStatus} onClick={() => patchStatus('sent', { sentAt: new Date().toISOString() })}>
              Marcar como Enviada
            </Button>
          )}
          {(proposal.status === 'sent' || proposal.status === 'viewed') && (
            <>
              <Button
                variant="outline"
                loading={updatingStatus}
                onClick={() => patchStatus('accepted', { acceptedAt: new Date().toISOString() })}
              >
                Marcar como Aceita
              </Button>
              <Button
                variant="outline"
                loading={updatingStatus}
                onClick={() => patchStatus('rejected')}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Rejeitar
              </Button>
            </>
          )}

          {/* Convert to contract (any non-converted, non-rejected) */}
          {!isConverted && proposal.status !== 'rejected' && !proposal.contractId && (
            <Button loading={converting} onClick={handleConvert}>
              Gerar Contrato
            </Button>
          )}

          {/* Link to contract if already converted */}
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

      {/* View toggle */}
      <div className="flex gap-1 p-1 bg-white/[0.05] rounded-xl w-fit">
        <button
          onClick={() => setShowInternal(false)}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
            !showInternal ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/70'
          )}
        >
          Visualização do Cliente
        </button>
        {hasCostData && (
          <button
            onClick={() => setShowInternal(true)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              showInternal ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/70'
            )}
          >
            Visão Interna (Custo/Margem)
          </button>
        )}
      </div>

      {/* Document */}
      {!showInternal ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
          <ProposalDocument
            proposalData={proposalData}
            mdrMatrix={mdrMatrix}
            proposalNumber={proposal.proposalNumber}
            intlProposalPricing={intlProposalPricing}
            setupIntl={setupIntl}
          />
        </div>
      ) : (
        <InternalView
          costTable={costTable}
          finalMatrix={finalMatrix}
          clientRates={clientRates}
          marginConfig={marginConfig}
          hasClientRates={hasClientRates}
        />
      )}
    </div>
  );
}

function InternalView({
  costTable,
  finalMatrix,
  clientRates,
  marginConfig,
  hasClientRates,
}: {
  costTable: MDRMatrix;
  finalMatrix: MDRMatrix;
  clientRates: MDRMatrix;
  marginConfig: MarginConfig;
  hasClientRates: boolean;
}) {
  const [tab, setTab] = useState<'margin' | 'saving'>('margin');

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-card p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Visão Interna</p>
            <p className="text-xs text-ink-500">Nunca aparece no PDF do cliente.</p>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-ink-100 rounded-xl">
          <button
            onClick={() => setTab('margin')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === 'margin' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            Minha Margem
          </button>
          <button
            onClick={() => setTab('saving')}
            disabled={!hasClientRates}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === 'saving' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
              !hasClientRates && 'opacity-40 cursor-not-allowed',
            )}
          >
            Saving do Cliente {!hasClientRates && '(sem dados)'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
        <strong>Margem:</strong>{' '}
        {marginConfig.type === 'percent'
          ? `${marginConfig.value}% sobre o custo`
          : `+${marginConfig.value} pp sobre o custo`}
      </div>

      {/* TAB: Minha Margem — Custo → +Mg → Final */}
      {tab === 'margin' && (
        <div className="overflow-x-auto rounded-xl border border-ink-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-ink-50 border-b border-ink-200">
                <th className="px-3 py-2 text-left font-semibold text-ink-600 w-12">Parc.</th>
                {BRANDS.map((b) => (
                  <th key={b} colSpan={3} className="px-2 py-2 text-center font-semibold text-ink-700 border-l border-ink-100">
                    {BRAND_LABELS[b]}
                  </th>
                ))}
              </tr>
              <tr className="bg-ink-50/50 border-b border-ink-100">
                <th className="px-3 py-1" />
                {BRANDS.map((b) => (
                  <Fragment key={b}>
                    <th className="px-2 py-1 text-center font-normal text-red-500 border-l border-ink-100">Custo</th>
                    <th className="px-2 py-1 text-center font-normal text-amber-600">+Mg</th>
                    <th className="px-2 py-1 text-center font-semibold text-emerald-600">Final</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {INSTALLMENTS.map((inst) => (
                <tr key={inst} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                  <td className="px-3 py-1.5 font-semibold text-ink-700">{inst}x</td>
                  {BRANDS.map((b) => {
                    const bd = computeMarginBreakdown(costTable, finalMatrix, b as BrandName, inst as InstallmentNumber);
                    return bd ? (
                      <Fragment key={b}>
                        <td className="px-2 py-1.5 text-center font-mono text-red-600 border-l border-ink-100">{bd.cost}%</td>
                        <td className="px-2 py-1.5 text-center font-mono text-amber-600">+{bd.margin}%</td>
                        <td className="px-2 py-1.5 text-center font-mono font-semibold text-emerald-700">{bd.final}%</td>
                      </Fragment>
                    ) : (
                      <Fragment key={b}>
                        <td className="px-2 py-1.5 text-center text-ink-300 border-l border-ink-100">—</td>
                        <td className="px-2 py-1.5 text-center text-ink-300">—</td>
                        <td className="px-2 py-1.5 text-center text-ink-300">—</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Saving do Cliente — Taxa atual → Nossa proposta → Saving */}
      {tab === 'saving' && (
        <div className="overflow-x-auto rounded-xl border border-ink-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-ink-50 border-b border-ink-200">
                <th className="px-3 py-2 text-left font-semibold text-ink-600 w-12">Parc.</th>
                {BRANDS.map((b) => (
                  <th key={b} colSpan={3} className="px-2 py-2 text-center font-semibold text-ink-700 border-l border-ink-100">
                    {BRAND_LABELS[b]}
                  </th>
                ))}
              </tr>
              <tr className="bg-ink-50/50 border-b border-ink-100">
                <th className="px-3 py-1" />
                {BRANDS.map((b) => (
                  <Fragment key={b}>
                    <th className="px-2 py-1 text-center font-normal text-ink-500 border-l border-ink-100">Atual</th>
                    <th className="px-2 py-1 text-center font-normal text-brand">Nossa</th>
                    <th className="px-2 py-1 text-center font-semibold text-emerald-600">Saving</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {INSTALLMENTS.map((inst) => (
                <tr key={inst} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                  <td className="px-3 py-1.5 font-semibold text-ink-700">{inst}x</td>
                  {BRANDS.map((b) => {
                    const clientEntry = clientRates[b as BrandName]?.[inst as InstallmentNumber];
                    const ourEntry    = finalMatrix[b as BrandName]?.[inst as InstallmentNumber];
                    const clientVal   = parseFloat(clientEntry?.finalMdr || clientEntry?.mdrBase || '');
                    const ourVal      = parseFloat(ourEntry?.finalMdr || ourEntry?.mdrBase || '');
                    const hasClient   = !isNaN(clientVal);
                    const hasOur      = !isNaN(ourVal);
                    const saving      = hasClient && hasOur ? (clientVal - ourVal) : NaN;

                    return (
                      <Fragment key={b}>
                        <td className="px-2 py-1.5 text-center font-mono text-ink-600 border-l border-ink-100">
                          {hasClient ? `${clientVal.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-brand">
                          {hasOur ? `${ourVal.toFixed(2)}%` : '—'}
                        </td>
                        <td className={cn(
                          'px-2 py-1.5 text-center font-mono font-semibold',
                          isNaN(saving) ? 'text-ink-300' : saving > 0 ? 'text-emerald-600' : saving < 0 ? 'text-red-500' : 'text-ink-400',
                        )}>
                          {isNaN(saving) ? '—' : saving > 0 ? `-${saving.toFixed(2)}%` : saving < 0 ? `+${Math.abs(saving).toFixed(2)}%` : '0%'}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
