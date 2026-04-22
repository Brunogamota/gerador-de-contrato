import React from 'react';
import { ProposalData } from '@/types/proposal';
import { MDRMatrix, INSTALLMENTS, BrandName, InstallmentNumber, IntlPricing } from '@/types/pricing';
import { cur } from '@/components/contract/document/formatters';
import { BrandLogo } from '@/components/shared/BrandLogo';

interface Props {
  d: ProposalData;
  mdrMatrix: MDRMatrix;
  intlProposalPricing?: IntlPricing;
  setupIntl?: string;
}

/* ─── Typography ─────────────────────────────────────────────────────────── */
const sans  = 'Arial, Helvetica, sans-serif';
/* Georgia gives financal numbers a premium, authoritative feel (Bloomberg / FT style) */
const serif = "Georgia, 'Times New Roman', serif";

const border = '1px solid #e8ecf0';
const BRANDS: BrandName[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];

const INST_LABELS: Record<number, string> = {
  1:  'À vista (1×)',    2:  'Parcelado 2×',   3:  'Parcelado 3×',
  4:  'Parcelado 4×',   5:  'Parcelado 5×',   6:  'Parcelado 6×',
  7:  'Parcelado 7×',   8:  'Parcelado 8×',   9:  'Parcelado 9×',
  10: 'Parcelado 10×', 11: 'Parcelado 11×',  12: 'Parcelado 12×',
};

const INST_NUM: Record<number, string> = {
  1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'11',12:'12',
};

function rate(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber, field: 'mdrBase'|'anticipationRate'|'finalMdr'): string {
  const v = matrix[brand]?.[inst]?.[field];
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '—';
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
    ...(p.year1Commitment     ? [['Compromisso Ano 1',      `$${p.year1Commitment} em taxas`]    as [string,string]] : []),
    ...(p.year2Commitment     ? [['Compromisso Ano 2',      `$${p.year2Commitment} em taxas`]    as [string,string]] : []),
    ...((p.connectPayoutRate || p.connectPayoutFlatFee)
        ? [['Connect — Repasse', `${p.connectPayoutRate||''}${p.connectPayoutFlatFee ? ' + $'+p.connectPayoutFlatFee : ''}`] as [string,string]] : []),
    ...(p.connectMonthlyFee    ? [['Connect — Mensal',      `$${p.connectMonthlyFee}/conta/mês`] as [string,string]] : []),
    ...(p.connectActivationFee ? [['Connect — Ativação',    `$${p.connectActivationFee}/conta`]  as [string,string]] : []),
    ...(p.radarStandardFee     ? [['Antifraude — Standard', `$${p.radarStandardFee}/transação`]  as [string,string]] : []),
    ...(p.radarRfftFee         ? [['Antifraude — RFFT',     `$${p.radarRfftFee}/transação`]      as [string,string]] : []),
    ...(p.intel3dsFee          ? [['Autenticação 3DS',       `$${p.intel3dsFee}/tentativa`]       as [string,string]] : []),
    ...(p.intelAdaptiveRate    ? [['Aceitação Adaptativa',   `${p.intelAdaptiveRate}%`]           as [string,string]] : []),
    ...(p.intelCardUpdaterFee  ? [['Atualização de Cartão',  `$${p.intelCardUpdaterFee}/cartão`]  as [string,string]] : []),
    ...(p.intelNetworkTokenFee ? [['Token de Rede',          `$${p.intelNetworkTokenFee}/token`]  as [string,string]] : []),
    ...(p.fxFeeRate            ? [['Taxa de Câmbio (FX)',    `+${p.fxFeeRate}%`]                  as [string,string]] : []),
    ...(p.disputeLostFee       ? [['Disputa — Caso perdido', `$${p.disputeLostFee}`]              as [string,string]] : []),
    ...(p.disputeFee           ? [['Disputa — Taxa',         `$${p.disputeFee}`]                  as [string,string]] : []),
    ...((setupIntl && parseFloat(setupIntl) > 0) ? [['Setup OPP Internacional', `$${setupIntl}`] as [string,string]] : []),
  ] : [];

  return (
    <div style={{ marginBottom: '32px', fontFamily: sans }}>

      {showBrasil && (<>

        {/* ── Section title ── */}
        <p style={{ fontFamily: sans, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          1. Taxas MDR — Merchant Discount Rate
        </p>
        <p style={{ fontFamily: sans, fontSize: '9pt', color: '#64748b', marginBottom: '16px' }}>
          Percentual aplicado sobre o valor bruto de cada transação, por bandeira e parcelas.
          A <strong>Taxa Final</strong> inclui MDR Base + Taxa de Antecipação.
        </p>

        {/* ── MDR table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            {/* Brand logo row */}
            <tr style={{ borderBottom: '2px solid #0f172a' }}>
              <th style={{
                fontFamily: sans, fontSize: '8.5pt', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#ffffff', background: '#0f172a',
                textAlign: 'center', padding: '16px 10px',
                border, width: '24%',
              }}>
                Modalidade
              </th>
              {BRANDS.map((brand) => (
                <th key={brand} style={{
                  background: '#ffffff', border,
                  padding: '14px 6px', textAlign: 'center', verticalAlign: 'middle',
                }}>
                  <BrandLogo brand={brand} />
                </th>
              ))}
            </tr>

            {/* Sub-header */}
            <tr style={{ background: '#f8fafc' }}>
              <td style={{
                fontFamily: sans, fontSize: '7.5pt', color: '#94a3b8',
                fontStyle: 'italic', padding: '5px 14px', border, letterSpacing: '0.01em',
              }}>
                Base · Ant. · <strong style={{ color: '#64748b', fontStyle: 'normal' }}>Taxa Final</strong>
              </td>
              {BRANDS.map((brand) => (
                <td key={brand} style={{
                  fontFamily: sans, fontSize: '7.5pt', color: '#94a3b8',
                  fontStyle: 'italic', textAlign: 'center', padding: '5px 6px', border,
                }}>
                  Base · Ant. · <strong style={{ color: '#64748b', fontStyle: 'normal' }}>Final</strong>
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {INSTALLMENTS.map((inst, i) => (
              <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>

                {/* Installment label */}
                <td style={{ padding: '11px 14px', border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Subtle pill badge */}
                    <span style={{
                      display: 'inline-block',
                      background: '#f1f5f9',
                      color: '#475569',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '8pt',
                      fontFamily: sans,
                      fontWeight: 600,
                      minWidth: '24px',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}>
                      {INST_NUM[inst as number]}×
                    </span>
                    <span style={{
                      fontFamily: sans, fontSize: '10.5pt',
                      color: '#1e293b', fontWeight: i === 0 ? 600 : 400,
                    }}>
                      {INST_LABELS[inst as number]}
                    </span>
                  </div>
                </td>

                {/* Brand rate cells */}
                {BRANDS.map((brand) => {
                  const base  = rate(mdrMatrix, brand, inst as InstallmentNumber, 'mdrBase');
                  const ant   = rate(mdrMatrix, brand, inst as InstallmentNumber, 'anticipationRate');
                  const final = rate(mdrMatrix, brand, inst as InstallmentNumber, 'finalMdr');
                  return (
                    <td key={brand} style={{ padding: '9px 6px', border, textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontFamily: sans, fontSize: '7.5pt', color: '#b0bac5', letterSpacing: '0.01em' }}>
                          {base} · {ant}
                        </span>
                        {/* Georgia for the rate number — premium financial feel */}
                        <span style={{ fontFamily: serif, fontSize: '13.5pt', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
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

        <p style={{ fontFamily: sans, fontSize: '8pt', color: '#b0bac5', fontStyle: 'italic', marginBottom: '28px' }}>
          * Valores aplicados sobre o volume bruto da transação por bandeira e número de parcelas.
        </p>

        {/* ── Fees table ── */}
        <p style={{ fontFamily: sans, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          2. Tabela de Preços Operacionais
        </p>
        <p style={{ fontFamily: sans, fontSize: '9pt', color: '#64748b', marginBottom: '12px' }}>
          Tarifas fixas e variáveis pelos serviços de gateway, antifraude e liquidação.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={{ fontFamily: sans, fontSize: '8.5pt', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'left',   padding: '11px 14px', border, width: '38%' }}>Serviço</th>
              <th style={{ fontFamily: sans, fontSize: '8.5pt', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f1f5f9', textAlign: 'center', padding: '11px 14px', border, width: '20%' }}>Valor</th>
              <th style={{ fontFamily: sans, fontSize: '8.5pt', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'left',   padding: '11px 14px', border }}>Observação</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(([tipo, valor, obs], i) => (
              <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                <td style={{ fontFamily: sans,  fontSize: '10.5pt', color: '#334155', padding: '10px 14px', border, fontWeight: 500 }}>{tipo}</td>
                <td style={{ fontFamily: serif, fontSize: '11pt',   color: '#0f172a', textAlign: 'center', padding: '10px 14px', border, fontWeight: 700 }}>{valor}</td>
                <td style={{ fontFamily: sans,  fontSize: '9pt',    color: '#94a3b8', padding: '10px 14px', border, fontStyle: 'italic' }}>{obs}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {parseFloat(d.valorMinimoMensal) > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #0f172a', borderRadius: '4px', padding: '12px 16px', marginBottom: '24px' }}>
            <p style={{ fontFamily: sans, fontSize: '10.5pt', color: '#334155', margin: 0, lineHeight: '1.7' }}>
              <strong>Valor mínimo mensal:</strong>{' '}
              <strong style={{ fontFamily: serif, fontSize: '12pt', color: '#0f172a' }}>{cur(d.valorMinimoMensal)}</strong>
              {' '}— cobrado caso as taxas devidas não atinjam este montante no período.
            </p>
          </div>
        )}
      </>)}

      {/* ── Internacional ── */}
      {hasIntl && intlRows.length > 0 && (<>
        <p style={{ fontFamily: sans, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          {showBrasil ? '3.' : '1.'} Precificação Internacional — Processamento Global
        </p>
        <p style={{ fontFamily: sans, fontSize: '9pt', color: '#64748b', marginBottom: '12px' }}>
          Tarifas de processamento internacional via Stripe Connect.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={{ fontFamily: sans, fontSize: '8.5pt', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'left', padding: '11px 14px', border, width: '45%' }}>Serviço</th>
              <th style={{ fontFamily: sans, fontSize: '8.5pt', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f1f5f9', textAlign: 'left', padding: '11px 14px', border }}>Valor / Condição</th>
            </tr>
          </thead>
          <tbody>
            {intlRows.map(([label, value], i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                <td style={{ fontFamily: sans,  fontSize: '10.5pt', color: '#334155', padding: '10px 14px', border, fontWeight: 500 }}>{label}</td>
                <td style={{ fontFamily: serif, fontSize: '10.5pt', color: '#0f172a', fontWeight: 600,    padding: '10px 14px', border }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #0f172a', borderRadius: '4px', padding: '10px 14px', marginBottom: '8px' }}>
          <p style={{ fontFamily: sans, fontSize: '9pt', color: '#475569', margin: 0 }}>
            <strong>Serviços incluídos:</strong> Processamento (Cartões, Wallets — Apple Pay/Google Pay) · Autenticação 3DS · Aceitação Adaptativa · Atualização de Cartão · Token de Rede · Connect · Antifraude
          </p>
        </div>
      </>)}
    </div>
  );
}
