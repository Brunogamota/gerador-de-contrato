import React from 'react';
import { ProposalData } from '@/types/proposal';
import { MDRMatrix, INSTALLMENTS, BrandName, InstallmentNumber, IntlPricing } from '@/types/pricing';
import { cur } from '@/components/contract/document/formatters';

interface Props {
  d: ProposalData;
  mdrMatrix: MDRMatrix;
  intlProposalPricing?: IntlPricing;
  setupIntl?: string;
}

const BRANDS: { key: BrandName; label: string; color: string; bg: string }[] = [
  { key: 'visa',       label: 'Visa',       color: '#1a56db', bg: '#EFF6FF' },
  { key: 'mastercard', label: 'Mastercard', color: '#b45309', bg: '#FFFBEB' },
  { key: 'elo',        label: 'Elo',        color: '#b91c1c', bg: '#FEF2F2' },
  { key: 'amex',       label: 'Amex',       color: '#065f46', bg: '#ECFDF5' },
  { key: 'hipercard',  label: 'Hipercard',  color: '#7c3aed', bg: '#F5F3FF' },
];

const INST_LABELS: Record<number, string> = {
  1: 'À vista (1×)',    2: 'Parcelado 2×',   3: 'Parcelado 3×',
  4: 'Parcelado 4×',   5: 'Parcelado 5×',   6: 'Parcelado 6×',
  7: 'Parcelado 7×',   8: 'Parcelado 8×',   9: 'Parcelado 9×',
  10: 'Parcelado 10×', 11: 'Parcelado 11×', 12: 'Parcelado 12×',
};

function getBase(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber): string {
  const v = matrix[brand]?.[inst]?.mdrBase;
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '—';
}
function getAnt(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber): string {
  const v = matrix[brand]?.[inst]?.anticipationRate;
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '—';
}
function getFinal(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber): string {
  const v = matrix[brand]?.[inst]?.finalMdr;
  if (!v || parseFloat(v) <= 0) return '—';
  return `${parseFloat(v).toFixed(2).replace('.', ',')}%`;
}

// ── Shared inline styles (px values ensure consistent PDF rendering) ──────────
const font = 'Arial, Helvetica, sans-serif';

const sectionTitle = {
  fontFamily: font, fontSize: '9px', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
  color: '#f72662', marginBottom: '10px', marginTop: '0px',
};

const feeLabel: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb', padding: '7px 12px',
  fontSize: '12px', color: '#374151', fontFamily: font, fontWeight: 500,
};
const feeVal: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb', padding: '7px 12px',
  fontSize: '12px', color: '#111827', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700,
};
const feeObs: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb', padding: '7px 12px',
  fontSize: '10px', color: '#9ca3af', fontFamily: font, fontStyle: 'italic',
};

export function ProposalPricingSection({ d, mdrMatrix, intlProposalPricing, setupIntl }: Props) {
  const tipo      = d.tipoMercado ?? 'brasil';
  const showBrasil = tipo !== 'intl';
  const hasIntl   = !!(intlProposalPricing?.processingRate) && tipo !== 'brasil';

  const fees: [string, string, string][] = [
    ['Setup OPP Brasil',       cur(d.setup),                                                         'Valor único na adesão'],
    ['Fee por Transação',      cur(d.feeTransacao),                                                  'Por transação processada'],
    ['Taxa de Antifraude',     cur(d.taxaAntifraude),                                                'Por transação verificada'],
    ['Taxa PIX In',            cur(d.taxaPix),                                                       'Por PIX recebido'],
    ['Taxa PIX Out',           cur(d.taxaPixOut),                                                    'Por PIX enviado'],
    ['Taxa por Split',         cur(d.taxaSplit),                                                     'Por split criado'],
    ['Taxa por Estorno',       cur(d.taxaEstorno),                                                   'Por estorno solicitado'],
    ['Taxa de Antecipação',    `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`,     'Quando solicitada'],
    ['Taxa Pré-Chargeback',    cur(d.taxaPreChargeback),                                             'Por pré-chargeback'],
    ['Taxa de Chargeback',     cur(d.taxaChargeback),                                                'Por chargeback gerado'],
    ['Prazo de Recebimento',   d.prazoRecebimento,                                                   'Dias após a transação'],
  ];

  const p = intlProposalPricing;
  const intlRows: [string, string][] = p ? [
    ['Processamento', `${p.processingRate ? p.processingRate + '%' : '–'}${p.processingFlatFee ? ' + $' + p.processingFlatFee : ''} ${p.pricingModel ? '(' + p.pricingModel + ')' : ''}`.trim()],
    ...(p.year1Commitment     ? [['Compromisso Ano 1',       `$${p.year1Commitment} em taxas`] as [string, string]] : []),
    ...(p.year2Commitment     ? [['Compromisso Ano 2',       `$${p.year2Commitment} em taxas`] as [string, string]] : []),
    ...(p.connectPayoutRate || p.connectPayoutFlatFee
        ? [['Connect — Repasse', `${p.connectPayoutRate ? p.connectPayoutRate + '%' : ''}${p.connectPayoutFlatFee ? ' + $' + p.connectPayoutFlatFee : ''}`] as [string, string]] : []),
    ...(p.connectMonthlyFee    ? [['Connect — Mensal',       `$${p.connectMonthlyFee}/conta/mês`] as [string, string]] : []),
    ...(p.connectActivationFee ? [['Connect — Ativação',     `$${p.connectActivationFee}/conta`] as [string, string]] : []),
    ...(p.radarStandardFee     ? [['Antifraude — Standard',  `$${p.radarStandardFee}/transação`] as [string, string]] : []),
    ...(p.radarRfftFee         ? [['Antifraude — RFFT',      `$${p.radarRfftFee}/transação`] as [string, string]] : []),
    ...(p.intel3dsFee          ? [['Autenticação 3DS',        `$${p.intel3dsFee}/tentativa`] as [string, string]] : []),
    ...(p.intelAdaptiveRate    ? [['Aceitação Adaptativa',    `${p.intelAdaptiveRate}%`] as [string, string]] : []),
    ...(p.intelCardUpdaterFee  ? [['Atualização de Cartão',   `$${p.intelCardUpdaterFee}/cartão`] as [string, string]] : []),
    ...(p.intelNetworkTokenFee ? [['Token de Rede',           `$${p.intelNetworkTokenFee}/token`] as [string, string]] : []),
    ...(p.fxFeeRate            ? [['Taxa de Câmbio (FX)',     `+${p.fxFeeRate}%`] as [string, string]] : []),
    ...(p.disputeLostFee       ? [['Disputa — Caso perdido',  `$${p.disputeLostFee}`] as [string, string]] : []),
    ...(p.disputeFee           ? [['Disputa — Taxa',          `$${p.disputeFee}`] as [string, string]] : []),
    ...((setupIntl && parseFloat(setupIntl) > 0) ? [['Setup OPP Internacional', `$${setupIntl}`] as [string, string]] : []),
  ] : [];

  return (
    <div style={{ marginBottom: '32px', fontFamily: font }}>

      {/* ── Brasil MDR ── */}
      {showBrasil && (
        <>
          <p style={sectionTitle}>Tabela MDR — Brasil (Merchant Discount Rate)</p>
          <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '12px', fontStyle: 'italic' }}>
            Taxas em % sobre o valor da transação. A Taxa Final inclui MDR Base + Antecipação.
          </p>

          {/* Unified table: Modalidade × 5 bandeiras */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
            <thead>
              {/* Brand header row */}
              <tr>
                <th style={{
                  border: '1px solid #d1d5db', padding: '10px 12px', textAlign: 'left',
                  fontSize: '12px', fontWeight: 700, background: '#1f2937', color: '#ffffff',
                  width: '22%',
                }}>
                  Modalidade
                </th>
                {BRANDS.map((b) => (
                  <th key={b.key} style={{
                    border: '1px solid #d1d5db', padding: '10px 8px', textAlign: 'center',
                    fontSize: '12px', fontWeight: 700,
                    background: b.bg, color: b.color,
                    width: '15.6%',
                  }}>
                    {b.label}
                  </th>
                ))}
              </tr>
              {/* Sub-header */}
              <tr style={{ background: '#f9fafb' }}>
                <td style={{
                  border: '1px solid #e5e7eb', padding: '4px 12px',
                  fontSize: '9px', color: '#9ca3af', fontStyle: 'italic',
                }}>
                  Base · Ant. · <strong>Taxa Final</strong>
                </td>
                {BRANDS.map((b) => (
                  <td key={b.key} style={{
                    border: '1px solid #e5e7eb', padding: '4px 6px', textAlign: 'center',
                    fontSize: '9px', color: '#9ca3af', fontStyle: 'italic',
                  }}>
                    Base · Ant. · <strong>Final</strong>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {INSTALLMENTS.map((inst, i) => (
                <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{
                    border: '1px solid #e5e7eb', padding: '9px 12px',
                    fontSize: '12px', color: '#374151', fontFamily: font,
                    fontWeight: i === 0 ? 600 : 400,
                  }}>
                    {INST_LABELS[inst as number]}
                  </td>
                  {BRANDS.map((b) => {
                    const base  = getBase(mdrMatrix, b.key, inst as InstallmentNumber);
                    const ant   = getAnt(mdrMatrix, b.key, inst as InstallmentNumber);
                    const final = getFinal(mdrMatrix, b.key, inst as InstallmentNumber);
                    return (
                      <td key={b.key} style={{
                        border: '1px solid #e5e7eb', padding: '7px 8px',
                        textAlign: 'center', verticalAlign: 'middle',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                          <span style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'monospace' }}>
                            {base} · {ant}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', fontFamily: 'monospace', letterSpacing: '-0.01em' }}>
                            {final}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic', marginBottom: '24px' }}>
            * Valores aplicados sobre o volume bruto da transação por bandeira e número de parcelas.
          </p>

          {/* ── Operational fees ── */}
          <p style={sectionTitle}>Taxas Operacionais — Brasil</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#1f2937' }}>
                <th style={{ ...feeLabel, borderBottom: '1px solid #374151', fontWeight: 700, color: '#fff', width: '38%' }}>Serviço</th>
                <th style={{ ...feeVal, borderBottom: '1px solid #374151', color: '#fff', width: '20%' }}>Valor</th>
                <th style={{ ...feeObs, borderBottom: '1px solid #374151', fontStyle: 'normal', fontWeight: 700, color: '#9ca3af' }}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(([tipo, valor, obs], i) => (
                <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={feeLabel}>{tipo}</td>
                  <td style={feeVal}>{valor}</td>
                  <td style={feeObs}>{obs}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {parseFloat(d.valorMinimoMensal) > 0 && (
            <div style={{
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '6px', padding: '12px 16px', marginBottom: '24px',
            }}>
              <p style={{ fontSize: '12px', color: '#374151', margin: 0, fontFamily: font }}>
                <strong>Valor mínimo mensal:</strong>{' '}
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                  {cur(d.valorMinimoMensal)}
                </span>
                {' '}— cobrado caso as taxas devidas não atinjam este montante no período.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Internacional ── */}
      {hasIntl && intlRows.length > 0 && (
        <>
          <p style={{ ...sectionTitle, color: '#1d4ed8' }}>Precificação Internacional — Processamento Global</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <thead>
              <tr style={{ background: '#1e3a8a' }}>
                <th style={{ ...feeLabel, borderBottom: '1px solid #3b4e9a', fontWeight: 700, color: '#fff', width: '45%' }}>Serviço</th>
                <th style={{ ...feeLabel, borderBottom: '1px solid #3b4e9a', fontWeight: 700, color: '#fff' }}>Valor / Condição</th>
              </tr>
            </thead>
            <tbody>
              {intlRows.map(([label, value], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? '#eff6ff' : '#ffffff' }}>
                  <td style={{ ...feeLabel, color: '#1e3a8a' }}>{label}</td>
                  <td style={{ ...feeLabel, fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 600 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 14px', marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', color: '#1e40af', margin: 0, fontFamily: font }}>
              <strong>Serviços incluídos:</strong> Processamento (Cartões, Wallets — Apple Pay/Google Pay) · Autenticação 3DS · Aceitação Adaptativa · Atualização de Cartão · Token de Rede · Connect · Antifraude
            </p>
          </div>
        </>
      )}
    </div>
  );
}
