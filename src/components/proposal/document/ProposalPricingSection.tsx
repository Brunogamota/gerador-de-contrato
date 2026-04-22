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

const f = 'Arial, Helvetica, sans-serif';
const border = '1px solid #e2e8f0';

type BrandConfig = {
  key: BrandName;
  label: string;
  headerBg: string;
  labelColor: string;
  labelSize: string;
  labelWeight: number;
};

const BRANDS: BrandConfig[] = [
  { key: 'visa',       label: 'VISA',       headerBg: '#ffffff', labelColor: '#1A1F71', labelSize: '15pt', labelWeight: 900 },
  { key: 'mastercard', label: 'mastercard', headerBg: '#ffffff', labelColor: '#252525', labelSize: '12pt', labelWeight: 700 },
  { key: 'elo',        label: 'elo',        headerBg: '#ffffff', labelColor: '#00A4E0', labelSize: '14pt', labelWeight: 900 },
  { key: 'amex',       label: 'AMEX',       headerBg: '#006FCF', labelColor: '#ffffff', labelSize: '13pt', labelWeight: 700 },
  { key: 'hipercard',  label: 'Hipercard',  headerBg: '#C8102E', labelColor: '#ffffff', labelSize: '12pt', labelWeight: 700 },
];

const INST_LABELS: Record<number, string> = {
  1: 'À vista (1×)',    2: 'Parcelado 2×',   3: 'Parcelado 3×',
  4: 'Parcelado 4×',   5: 'Parcelado 5×',   6: 'Parcelado 6×',
  7: 'Parcelado 7×',   8: 'Parcelado 8×',   9: 'Parcelado 9×',
  10: 'Parcelado 10×', 11: 'Parcelado 11×', 12: 'Parcelado 12×',
};

const INST_BADGE: Record<number, string> = {
  1:'1×', 2:'2×', 3:'3×', 4:'4×', 5:'5×', 6:'6×',
  7:'7×', 8:'8×', 9:'9×', 10:'10×', 11:'11×', 12:'12×',
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

export function ProposalPricingSection({ d, mdrMatrix, intlProposalPricing, setupIntl }: Props) {
  const tipo       = d.tipoMercado ?? 'brasil';
  const showBrasil = tipo !== 'intl';
  const hasIntl    = !!(intlProposalPricing?.processingRate) && tipo !== 'brasil';

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
    ...(p.year1Commitment     ? [['Compromisso Ano 1',      `$${p.year1Commitment} em taxas`] as [string, string]] : []),
    ...(p.year2Commitment     ? [['Compromisso Ano 2',      `$${p.year2Commitment} em taxas`] as [string, string]] : []),
    ...(p.connectPayoutRate || p.connectPayoutFlatFee
        ? [['Connect — Repasse', `${p.connectPayoutRate ? p.connectPayoutRate + '%' : ''}${p.connectPayoutFlatFee ? ' + $' + p.connectPayoutFlatFee : ''}`] as [string, string]] : []),
    ...(p.connectMonthlyFee    ? [['Connect — Mensal',      `$${p.connectMonthlyFee}/conta/mês`] as [string, string]] : []),
    ...(p.connectActivationFee ? [['Connect — Ativação',    `$${p.connectActivationFee}/conta`] as [string, string]] : []),
    ...(p.radarStandardFee     ? [['Antifraude — Standard', `$${p.radarStandardFee}/transação`] as [string, string]] : []),
    ...(p.radarRfftFee         ? [['Antifraude — RFFT',     `$${p.radarRfftFee}/transação`] as [string, string]] : []),
    ...(p.intel3dsFee          ? [['Autenticação 3DS',       `$${p.intel3dsFee}/tentativa`] as [string, string]] : []),
    ...(p.intelAdaptiveRate    ? [['Aceitação Adaptativa',   `${p.intelAdaptiveRate}%`] as [string, string]] : []),
    ...(p.intelCardUpdaterFee  ? [['Atualização de Cartão',  `$${p.intelCardUpdaterFee}/cartão`] as [string, string]] : []),
    ...(p.intelNetworkTokenFee ? [['Token de Rede',          `$${p.intelNetworkTokenFee}/token`] as [string, string]] : []),
    ...(p.fxFeeRate            ? [['Taxa de Câmbio (FX)',    `+${p.fxFeeRate}%`] as [string, string]] : []),
    ...(p.disputeLostFee       ? [['Disputa — Caso perdido', `$${p.disputeLostFee}`] as [string, string]] : []),
    ...(p.disputeFee           ? [['Disputa — Taxa',         `$${p.disputeFee}`] as [string, string]] : []),
    ...((setupIntl && parseFloat(setupIntl) > 0) ? [['Setup OPP Internacional', `$${setupIntl}`] as [string, string]] : []),
  ] : [];

  return (
    <div style={{ marginBottom: '32px', fontFamily: f }}>

      {showBrasil && (
        <>
          <p style={{ fontFamily: f, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            1. Taxas MDR — Merchant Discount Rate
          </p>
          <p style={{ fontFamily: f, fontSize: '9pt', color: '#64748b', marginBottom: '12px' }}>
            Percentual aplicado sobre o valor bruto de cada transação, por bandeira e número de parcelas.
            A Taxa Final inclui MDR Base + Taxa de Antecipação.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
            <thead>
              {/* Brand header row */}
              <tr>
                <th style={{
                  fontFamily: f, fontSize: '10pt', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#ffffff', background: '#1e3a5f',
                  textAlign: 'center', padding: '14px 12px', border, width: '22%',
                }}>
                  Modalidade
                </th>
                {BRANDS.map((b) => (
                  <th key={b.key} style={{
                    background: b.headerBg,
                    border,
                    padding: '12px 8px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}>
                    <span style={{
                      fontFamily: f,
                      fontSize: b.labelSize,
                      fontWeight: b.labelWeight,
                      color: b.labelColor,
                      letterSpacing: b.key === 'visa' || b.key === 'amex' ? '0.06em' : '0',
                    }}>
                      {b.label}
                    </span>
                  </th>
                ))}
              </tr>
              {/* Sub-header row */}
              <tr style={{ background: '#f1f5f9' }}>
                <td style={{
                  fontFamily: f, fontSize: '8pt', color: '#64748b', fontStyle: 'italic',
                  padding: '5px 12px', border,
                }}>
                  Base · Ant. · <strong style={{ color: '#475569' }}>Taxa Final</strong>
                </td>
                {BRANDS.map((b) => (
                  <td key={b.key} style={{
                    fontFamily: f, fontSize: '8pt', color: '#64748b', fontStyle: 'italic',
                    textAlign: 'center', padding: '5px 8px', border,
                  }}>
                    Base · Ant. · <strong style={{ color: '#475569' }}>Final</strong>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {INSTALLMENTS.map((inst, i) => (
                <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '10px 12px', border }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        background: '#1e3a8a',
                        color: '#ffffff',
                        borderRadius: '5px',
                        padding: '3px 7px',
                        fontSize: '8.5pt',
                        fontWeight: 700,
                        fontFamily: f,
                        minWidth: '28px',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}>
                        {INST_BADGE[inst as number]}
                      </div>
                      <span style={{
                        fontFamily: f,
                        fontSize: '10.5pt',
                        color: '#374151',
                        fontWeight: i === 0 ? 600 : 400,
                      }}>
                        {INST_LABELS[inst as number]}
                      </span>
                    </div>
                  </td>
                  {BRANDS.map((b) => {
                    const base  = getBase(mdrMatrix, b.key, inst as InstallmentNumber);
                    const ant   = getAnt(mdrMatrix, b.key, inst as InstallmentNumber);
                    const final = getFinal(mdrMatrix, b.key, inst as InstallmentNumber);
                    return (
                      <td key={b.key} style={{ padding: '8px', border, textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#9ca3af' }}>
                            {base} · {ant}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '12pt', fontWeight: 700, color: '#111827' }}>
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

          <p style={{ fontFamily: f, fontSize: '8pt', color: '#9ca3af', fontStyle: 'italic', marginBottom: '24px' }}>
            &#9432; * Valores aplicados sobre o volume bruto da transação por bandeira e número de parcelas.
          </p>

          {/* Operational fees */}
          <p style={{ fontFamily: f, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            2. Tabela de Preços Operacionais
          </p>
          <p style={{ fontFamily: f, fontSize: '9pt', color: '#64748b', marginBottom: '12px' }}>
            Tarifas fixas e variáveis pelos serviços de gateway, antifraude e liquidação.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#1e3a5f' }}>
                <th style={{ fontFamily: f, fontSize: '10pt', fontWeight: 600, color: '#94a3b8', textAlign: 'left', padding: '11px 14px', border, width: '38%' }}>Serviço</th>
                <th style={{ fontFamily: f, fontSize: '10pt', fontWeight: 600, color: '#f1f5f9', textAlign: 'center', padding: '11px 14px', border, width: '20%' }}>Valor</th>
                <th style={{ fontFamily: f, fontSize: '10pt', fontWeight: 600, color: '#94a3b8', textAlign: 'left', padding: '11px 14px', border }}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(([tipo, valor, obs], i) => (
                <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ fontFamily: f, fontSize: '10.5pt', color: '#334155', padding: '10px 14px', border, fontWeight: 500 }}>{tipo}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11pt', fontWeight: 700, color: '#0f172a', textAlign: 'center', padding: '10px 14px', border }}>{valor}</td>
                  <td style={{ fontFamily: f, fontSize: '9pt', color: '#94a3b8', padding: '10px 14px', border, fontStyle: 'italic' }}>{obs}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {parseFloat(d.valorMinimoMensal) > 0 && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #1e3a5f', borderRadius: '4px', padding: '12px 16px', marginBottom: '24px' }}>
              <p style={{ fontFamily: f, fontSize: '10.5pt', color: '#334155', margin: 0, lineHeight: '1.7' }}>
                <strong>Valor mínimo mensal:</strong>{' '}
                <strong style={{ fontSize: '12pt', color: '#0f172a' }}>{cur(d.valorMinimoMensal)}</strong>
                {' '}— cobrado caso as taxas devidas não atinjam este montante no período.
              </p>
            </div>
          )}
        </>
      )}

      {/* Internacional */}
      {hasIntl && intlRows.length > 0 && (
        <>
          <p style={{ fontFamily: f, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            {showBrasil ? '3.' : '1.'} Precificação Internacional — Processamento Global
          </p>
          <p style={{ fontFamily: f, fontSize: '9pt', color: '#64748b', marginBottom: '12px' }}>
            Tarifas de processamento internacional via Stripe Connect.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <thead>
              <tr style={{ background: '#1e3a5f' }}>
                <th style={{ fontFamily: f, fontSize: '10pt', fontWeight: 600, color: '#94a3b8', textAlign: 'left', padding: '11px 14px', border, width: '45%' }}>Serviço</th>
                <th style={{ fontFamily: f, fontSize: '10pt', fontWeight: 600, color: '#f1f5f9', textAlign: 'left', padding: '11px 14px', border }}>Valor / Condição</th>
              </tr>
            </thead>
            <tbody>
              {intlRows.map(([label, value], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ fontFamily: f, fontSize: '10.5pt', color: '#334155', padding: '10px 14px', border, fontWeight: 500 }}>{label}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '10.5pt', color: '#0f172a', fontWeight: 600, padding: '10px 14px', border }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #1e3a5f', borderRadius: '4px', padding: '10px 14px', marginBottom: '8px' }}>
            <p style={{ fontFamily: f, fontSize: '9pt', color: '#475569', margin: 0 }}>
              <strong>Serviços incluídos:</strong> Processamento (Cartões, Wallets — Apple Pay/Google Pay) · Autenticação 3DS · Aceitação Adaptativa · Atualização de Cartão · Token de Rede · Connect · Antifraude
            </p>
          </div>
        </>
      )}
    </div>
  );
}
