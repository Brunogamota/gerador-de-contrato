import { ProposalData } from '@/types/proposal';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber, IntlPricing } from '@/types/pricing';
import { cur } from '@/components/contract/document/formatters';

function mdrVal(matrix: MDRMatrix, brand: BrandName, inst: number): string {
  const v = matrix[brand][inst as InstallmentNumber]?.finalMdr;
  return v ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '–';
}

const TH_BRAND = 'px-2 py-2 text-xs font-semibold text-center border border-white/20';
const TD_INST  = 'px-2 py-1.5 text-center text-xs border-b border-gray-100';
const TD_RATE  = 'px-2 py-1.5 text-center text-xs font-mono border-b border-gray-100';
const FEE_LABEL = 'px-3 py-1.5 text-xs';
const FEE_VAL   = 'px-3 py-1.5 text-xs text-center font-medium';
const FEE_OBS   = 'px-3 py-1.5 text-xs';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#f72662', letterSpacing: '0.1em' }}>
      {children}
    </p>
  );
}

interface Props {
  d: ProposalData;
  mdrMatrix: MDRMatrix;
  intlProposalPricing?: IntlPricing;
  setupIntl?: string;
}

export function ProposalPricingSection({ d, mdrMatrix, intlProposalPricing, setupIntl }: Props) {
  const hasIntl = !!(intlProposalPricing?.processingRate);

  const fees: [string, string, string][] = [
    ['Setup OPP Brasil',      cur(d.setup),                                     'Valor único na adesão — após liberação da adquirente'],
    ['Fee por Transação',     cur(d.feeTransacao),                              'Por cada transação processada'],
    ['Taxa de Antifraude',    cur(d.taxaAntifraude),                            'Por transação verificada'],
    ['Taxa PIX In',           cur(d.taxaPix),                                   'Por cada PIX recebido'],
    ['Taxa PIX Out',          cur(d.taxaPixOut),                                'Por cada PIX enviado'],
    ['Taxa por Split',        cur(d.taxaSplit),                                 'Por cada operação de split'],
    ['Taxa por Estorno',      cur(d.taxaEstorno),                               'Por cada estorno solicitado'],
    ['Taxa de Antecipação',   `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`, 'Quando solicitada'],
    ['Taxa Pré-Chargeback',   cur(d.taxaPreChargeback),                         'Por cada pré-chargeback'],
    ['Taxa de Chargeback',    cur(d.taxaChargeback),                            'Por cada chargeback gerado'],
    ['Prazo de Recebimento',  d.prazoRecebimento,                               'Dias após a transação'],
  ];

  const p = intlProposalPricing;

  const intlRows: [string, string][] = p ? [
    ['Processamento',                     `${p.processingRate ? p.processingRate + '%' : '–'}${p.processingFlatFee ? ' + $' + p.processingFlatFee : ''} ${p.pricingModel ? '(' + p.pricingModel + ')' : ''}`.trim()],
    ...(p.year1Commitment  ? [['Year 1 Commitment',  `$${p.year1Commitment} in Stripe Fees`] as [string,string]] : []),
    ...(p.year2Commitment  ? [['Year 2 Commitment',  `$${p.year2Commitment} in Stripe Fees`] as [string,string]] : []),
    ...(p.connectPayoutRate || p.connectPayoutFlatFee ? [['Stripe Connect — Payout', `${p.connectPayoutRate ? p.connectPayoutRate + '%' : ''}${p.connectPayoutFlatFee ? ' + $' + p.connectPayoutFlatFee : ''} por payout`.trim()] as [string,string]] : []),
    ...(p.connectMonthlyFee   ? [['Stripe Connect — Mensal',  `$${p.connectMonthlyFee} / conta ativa / mês`] as [string,string]] : []),
    ...(p.connectActivationFee ? [['Stripe Connect — Ativação', `$${p.connectActivationFee} por conta ativada`] as [string,string]] : []),
    ...(p.radarStandardFee  ? [['Radar — Standard',  `$${p.radarStandardFee} / transação escaneada`] as [string,string]] : []),
    ...(p.radarRfftFee      ? [['Radar — RFFTs',     `$${p.radarRfftFee} / transação escaneada`] as [string,string]] : []),
    ...(p.intel3dsFee       ? [['Payment Intel — 3DS',             `$${p.intel3dsFee} por tentativa`] as [string,string]] : []),
    ...(p.intelAdaptiveRate ? [['Payment Intel — Adaptive acceptance', `${p.intelAdaptiveRate}%`] as [string,string]] : []),
    ...(p.intelCardUpdaterFee ? [['Payment Intel — Card Account Updater', `$${p.intelCardUpdaterFee} por cartão atualizado`] as [string,string]] : []),
    ...(p.intelNetworkTokenFee ? [['Payment Intel — Network token', `$${p.intelNetworkTokenFee} por token`] as [string,string]] : []),
    ...(p.fxFeeRate   ? [['Foreign Exchange fee',  `+${p.fxFeeRate}%`] as [string,string]] : []),
    ...(p.disputeLostFee ? [['Disputa perdida',    `$${p.disputeLostFee}`] as [string,string]] : []),
    ...(p.disputeFee    ? [['Por disputar',         `$${p.disputeFee}`] as [string,string]] : []),
    ...((setupIntl && parseFloat(setupIntl) > 0) ? [['Setup OPP Internacional', `$${setupIntl} — após liberação da adquirente`] as [string,string]] : []),
  ] : [];

  return (
    <div className="mb-8">
      {/* ── Brasil MDR ── */}
      <SectionTitle>Tabela MDR — Brasil (Merchant Discount Rate)</SectionTitle>
      <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, #f72662 0%, #771339 100%)', color: '#fff', WebkitPrintColorAdjust: 'exact' as const, printColorAdjust: 'exact' as const }}>
            <th className="px-2 py-2 text-xs font-semibold text-left" style={{ color: 'rgba(255,255,255,0.7)' }}>Parc.</th>
            {BRANDS.map((b) => (
              <th key={b} className={TH_BRAND}>{BRAND_LABELS[b]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INSTALLMENTS.map((inst, i) => (
            <tr key={inst} style={{ background: i % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
              <td className={TD_INST} style={{ fontWeight: 600, color: '#374151', textAlign: 'left', paddingLeft: '8px' }}>{inst}x</td>
              {BRANDS.map((b) => (
                <td key={b} className={TD_RATE} style={{ color: '#111827' }}>
                  {mdrVal(mdrMatrix, b as BrandName, inst as InstallmentNumber)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Operational fees (Brasil) ── */}
      <SectionTitle>Taxas Operacionais — Brasil</SectionTitle>
      <table className="w-full mb-8" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
            <th className="px-3 py-2 text-xs font-semibold text-left" style={{ color: '#374151', width: '40%' }}>Serviço</th>
            <th className="px-3 py-2 text-xs font-semibold text-center" style={{ color: '#374151', width: '20%' }}>Valor</th>
            <th className="px-3 py-2 text-xs font-semibold text-left" style={{ color: '#374151' }}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(([tipo, valor, obs], i) => (
            <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
              <td className={FEE_LABEL} style={{ color: '#374151' }}>{tipo}</td>
              <td className={FEE_VAL} style={{ color: '#111827' }}>{valor}</td>
              <td className={FEE_OBS} style={{ color: '#6b7280' }}>{obs}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {parseFloat(d.valorMinimoMensal) > 0 && (
        <p className="text-xs mb-8" style={{ color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>Valor mínimo mensal:</span>{' '}
          {cur(d.valorMinimoMensal)} — cobrado caso as taxas devidas não atinjam este montante.
        </p>
      )}

      {/* ── Internacional ── */}
      {hasIntl && intlRows.length > 0 && (
        <>
          <SectionTitle>Precificação Internacional — Stripe Connect + Radar</SectionTitle>
          <table className="w-full mb-4" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', color: '#fff', WebkitPrintColorAdjust: 'exact' as const, printColorAdjust: 'exact' as const }}>
                <th className="px-3 py-2 text-xs font-semibold text-left" style={{ color: 'rgba(255,255,255,0.85)', width: '45%' }}>Serviço</th>
                <th className="px-3 py-2 text-xs font-semibold text-left" style={{ color: 'rgba(255,255,255,0.85)' }}>Valor / Condição</th>
              </tr>
            </thead>
            <tbody>
              {intlRows.map(([label, value], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? '#eff6ff' : '#ffffff', borderBottom: '1px solid #dbeafe' }}>
                  <td className="px-3 py-1.5 text-xs" style={{ color: '#374151', fontWeight: 500 }}>{label}</td>
                  <td className="px-3 py-1.5 text-xs font-mono" style={{ color: '#1e40af' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
            <p className="text-xs" style={{ color: '#1e40af', margin: 0 }}>
              <strong>Serviços incluídos:</strong> Processamento de pagamentos (Cartões, Wallets — Apple Pay/Google Pay, Payment Intel 3DS/AA/CAU/NT) · Stripe Connect · Radar
            </p>
          </div>
        </>
      )}
    </div>
  );
}
