import { ProposalData } from '@/types/proposal';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber, IntlPricing } from '@/types/pricing';
import { INSTALLMENT_LABELS, mdrBaseStr, mdrAntStr, mdrFinalStr, cur } from '@/components/contract/document/formatters';
import { BrandLogo } from '@/components/contract/document/BrandLogo';

const S = {
  sectionTitle: { fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#f72662', marginBottom: '10px' },
  th:    { border: '1px solid #e5e7eb', padding: '6px 8px', fontSize: '10px', fontWeight: 600, background: '#f9fafb', color: '#374151' },
  thSub: { border: '1px solid #e5e7eb', padding: '4px 6px', fontSize: '9px',  fontWeight: 500, background: '#f9fafb', color: '#6b7280', textAlign: 'center' as const },
  thSubBold: { border: '1px solid #e5e7eb', padding: '4px 6px', fontSize: '9px', fontWeight: 700, background: '#f9fafb', color: '#111827', textAlign: 'center' as const },
  tdLabel: { border: '1px solid #e5e7eb', padding: '5px 8px', fontSize: '10px', color: '#374151' },
  tdNum:   { border: '1px solid #e5e7eb', padding: '5px 6px', fontSize: '10px', color: '#111827', textAlign: 'center' as const, fontFamily: 'monospace' },
  tdNumBold: { border: '1px solid #e5e7eb', padding: '5px 6px', fontSize: '10px', color: '#111827', textAlign: 'center' as const, fontFamily: 'monospace', fontWeight: 700 },
  feeLabel: { border: '1px solid #e5e7eb', padding: '5px 10px', fontSize: '10px', color: '#374151', fontWeight: 500 },
  feeVal:   { border: '1px solid #e5e7eb', padding: '5px 10px', fontSize: '10px', color: '#111827', textAlign: 'center' as const, fontWeight: 600 },
  feeObs:   { border: '1px solid #e5e7eb', padding: '5px 10px', fontSize: '10px', color: '#6b7280' },
};

interface Props {
  d: ProposalData;
  mdrMatrix: MDRMatrix;
  intlProposalPricing?: IntlPricing;
  setupIntl?: string;
}

export function ProposalPricingSection({ d, mdrMatrix, intlProposalPricing, setupIntl }: Props) {
  const hasIntl = !!(intlProposalPricing?.processingRate);

  const fees: [string, string, string][] = [
    ['Setup OPP Brasil',       cur(d.setup),                                                             'Valor único na adesão — após liberação da adquirente'],
    ['Fee por Transação',      cur(d.feeTransacao),                                                      'Por cada transação processada'],
    ['Taxa de Antifraude',     cur(d.taxaAntifraude),                                                    'Por transação verificada'],
    ['Taxa PIX In',            cur(d.taxaPix),                                                           'Por cada PIX recebido'],
    ['Taxa PIX Out',           cur(d.taxaPixOut),                                                        'Por cada PIX enviado'],
    ['Taxa por Split',         cur(d.taxaSplit),                                                         'Por cada operação de split'],
    ['Taxa por Estorno',       cur(d.taxaEstorno),                                                       'Por cada estorno solicitado'],
    ['Taxa de Antecipação',    `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`,         'Quando solicitada'],
    ['Taxa Pré-Chargeback',    cur(d.taxaPreChargeback),                                                 'Por cada pré-chargeback'],
    ['Taxa de Chargeback',     cur(d.taxaChargeback),                                                    'Por cada chargeback gerado'],
    ['Prazo de Recebimento',   d.prazoRecebimento,                                                       'Dias após a transação'],
  ];

  const p = intlProposalPricing;
  const intlRows: [string, string][] = p ? [
    ['Processamento', `${p.processingRate ? p.processingRate + '%' : '–'}${p.processingFlatFee ? ' + $' + p.processingFlatFee : ''} ${p.pricingModel ? '(' + p.pricingModel + ')' : ''}`.trim()],
    ...(p.year1Commitment   ? [['Year 1 Commitment',  `$${p.year1Commitment} in Stripe Fees`] as [string,string]] : []),
    ...(p.year2Commitment   ? [['Year 2 Commitment',  `$${p.year2Commitment} in Stripe Fees`] as [string,string]] : []),
    ...(p.connectPayoutRate || p.connectPayoutFlatFee ? [['Stripe Connect — Payout', `${p.connectPayoutRate ? p.connectPayoutRate + '%' : ''}${p.connectPayoutFlatFee ? ' + $' + p.connectPayoutFlatFee : ''} por payout`.trim()] as [string,string]] : []),
    ...(p.connectMonthlyFee    ? [['Stripe Connect — Mensal',    `$${p.connectMonthlyFee} / conta ativa / mês`] as [string,string]] : []),
    ...(p.connectActivationFee ? [['Stripe Connect — Ativação',  `$${p.connectActivationFee} por conta ativada`] as [string,string]] : []),
    ...(p.radarStandardFee  ? [['Radar — Standard',              `$${p.radarStandardFee} / transação escaneada`] as [string,string]] : []),
    ...(p.radarRfftFee      ? [['Radar — RFFTs',                 `$${p.radarRfftFee} / transação escaneada`] as [string,string]] : []),
    ...(p.intel3dsFee       ? [['Payment Intel — 3DS',           `$${p.intel3dsFee} por tentativa`] as [string,string]] : []),
    ...(p.intelAdaptiveRate ? [['Payment Intel — Adaptive acceptance', `${p.intelAdaptiveRate}%`] as [string,string]] : []),
    ...(p.intelCardUpdaterFee ? [['Payment Intel — Card Account Updater', `$${p.intelCardUpdaterFee} por cartão atualizado`] as [string,string]] : []),
    ...(p.intelNetworkTokenFee ? [['Payment Intel — Network token', `$${p.intelNetworkTokenFee} por token`] as [string,string]] : []),
    ...(p.fxFeeRate    ? [['Foreign Exchange fee', `+${p.fxFeeRate}%`] as [string,string]] : []),
    ...(p.disputeLostFee ? [['Disputa perdida',    `$${p.disputeLostFee}`] as [string,string]] : []),
    ...(p.disputeFee    ? [['Por disputar',         `$${p.disputeFee}`] as [string,string]] : []),
    ...((setupIntl && parseFloat(setupIntl) > 0) ? [['Setup OPP Internacional', `$${setupIntl} — após liberação da adquirente`] as [string,string]] : []),
  ] : [];

  return (
    <div style={{ marginBottom: '32px' }}>

      {/* ── Brasil MDR ── */}
      <p style={S.sectionTitle}>Tabela MDR — Brasil (Merchant Discount Rate)</p>

      {/* Brand logos row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151' }}>Bandeiras:</span>
        {BRANDS.map((b) => <BrandLogo key={b} brand={b as BrandName} />)}
      </div>

      {/* MDR table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: 'left', width: '28%' }}>Modo</th>
            {BRANDS.map((b) => (
              <th key={b} colSpan={3} style={{ ...S.th, textAlign: 'center' }}>
                {BRAND_LABELS[b as BrandName]}
              </th>
            ))}
          </tr>
          <tr>
            <th style={{ ...S.thSub, textAlign: 'left' }} />
            {BRANDS.map((b) => (
              <>
                <th key={`${b}-t`} style={S.thSub}>Transação (%)</th>
                <th key={`${b}-a`} style={S.thSub}>Antecipação (%)</th>
                <th key={`${b}-f`} style={S.thSubBold}>Taxa (%)</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {INSTALLMENTS.map((inst, i) => (
            <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
              <td style={S.tdLabel}>{INSTALLMENT_LABELS[inst as number]}</td>
              {BRANDS.map((b) => (
                <>
                  <td key={`${b}-t`} style={S.tdNum}>{mdrBaseStr(mdrMatrix, b as BrandName, inst as InstallmentNumber)}</td>
                  <td key={`${b}-a`} style={S.tdNum}>{mdrAntStr(mdrMatrix,  b as BrandName, inst as InstallmentNumber)}</td>
                  <td key={`${b}-f`} style={S.tdNumBold}>{mdrFinalStr(mdrMatrix, b as BrandName, inst as InstallmentNumber)}</td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Operational fees (Brasil) ── */}
      <p style={S.sectionTitle}>Taxas Operacionais — Brasil</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: 'left', width: '38%' }}>Serviço</th>
            <th style={{ ...S.th, textAlign: 'center', width: '18%' }}>Valor</th>
            <th style={{ ...S.th, textAlign: 'left' }}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(([tipo, valor, obs], i) => (
            <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
              <td style={S.feeLabel}>{tipo}</td>
              <td style={S.feeVal}>{valor}</td>
              <td style={S.feeObs}>{obs}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {parseFloat(d.valorMinimoMensal) > 0 && (
        <p style={{ fontSize: '10px', color: '#374151', marginBottom: '24px' }}>
          <strong>Valor mínimo mensal:</strong>{' '}
          {cur(d.valorMinimoMensal)} — cobrado caso as taxas devidas não atinjam este montante.
        </p>
      )}

      {/* ── Internacional ── */}
      {hasIntl && intlRows.length > 0 && (
        <>
          <p style={{ ...S.sectionTitle, color: '#1d4ed8' }}>Precificação Internacional — Stripe Connect + Radar</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: 'left', width: '45%', color: '#1d4ed8' }}>Serviço</th>
                <th style={{ ...S.th, textAlign: 'left', color: '#1d4ed8' }}>Valor / Condição</th>
              </tr>
            </thead>
            <tbody>
              {intlRows.map(([label, value], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? '#eff6ff' : '#ffffff' }}>
                  <td style={{ ...S.feeLabel, color: '#1e3a8a' }}>{label}</td>
                  <td style={{ ...S.feeLabel, fontFamily: 'monospace', color: '#1d4ed8' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', color: '#1e40af', margin: 0 }}>
              <strong>Serviços incluídos:</strong> Processamento de pagamentos (Cartões, Wallets — Apple Pay/Google Pay, Payment Intel 3DS/AA/CAU/NT) · Stripe Connect · Radar
            </p>
          </div>
        </>
      )}
    </div>
  );
}
