import { ProposalData } from '@/types/proposal';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber } from '@/types/pricing';
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

interface Props {
  d: ProposalData;
  mdrMatrix: MDRMatrix;
}

export function ProposalPricingSection({ d, mdrMatrix }: Props) {
  const fees: [string, string, string][] = [
    ['Setup',                   cur(d.setup),                                     'Valor único na adesão'],
    ['Fee por Transação',       cur(d.feeTransacao),                              'Por cada transação processada'],
    ['Taxa de Antifraude',      cur(d.taxaAntifraude),                            'Por transação verificada'],
    ['Taxa PIX In',             cur(d.taxaPix),                                   'Por cada PIX recebido'],
    ['Taxa PIX Out',            cur(d.taxaPixOut),                                'Por cada PIX enviado'],
    ['Taxa por Split',          cur(d.taxaSplit),                                 'Por cada operação de split'],
    ['Taxa por Estorno',        cur(d.taxaEstorno),                               'Por cada estorno solicitado'],
    ['Taxa de Antecipação',     `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`, 'Quando solicitada'],
    ['Taxa de Pré-Chargeback',  cur(d.taxaPreChargeback),                         'Por cada pré-chargeback'],
    ['Taxa de Chargeback',      cur(d.taxaChargeback),                            'Por cada chargeback gerado'],
    ['Prazo de Recebimento',    d.prazoRecebimento,                               'Dias após a transação'],
  ];

  return (
    <div className="mb-8">
      {/* MDR table */}
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: '#f72662', letterSpacing: '0.1em' }}
      >
        Tabela MDR — Merchant Discount Rate
      </p>
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

      {/* Operational fees */}
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: '#f72662', letterSpacing: '0.1em' }}
      >
        Taxas Operacionais
      </p>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
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
        <p className="text-xs mt-3" style={{ color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>Valor mínimo mensal:</span>{' '}
          {cur(d.valorMinimoMensal)} — cobrado caso as taxas devidas não atinjam este montante.
        </p>
      )}
    </div>
  );
}
