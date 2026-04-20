import { ProposalData } from '@/types/proposal';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber } from '@/types/pricing';
import { TD, TH, mdrVal, cur } from '@/components/contract/document/formatters';

interface Props {
  d: ProposalData;
  mdrMatrix: MDRMatrix;
}

export function ProposalPricingSection({ d, mdrMatrix }: Props) {
  const fees: [string, string, string][] = [
    ['Setup', cur(d.setup), 'Valor único na adesão'],
    ['Fee por Transação', cur(d.feeTransacao), 'Por cada transação processada'],
    ['Taxa de Antifraude', cur(d.taxaAntifraude), 'Por transação verificada'],
    ['Taxa PIX In', cur(d.taxaPix), 'Por cada PIX recebido'],
    ['Taxa PIX Out', cur(d.taxaPixOut), 'Por cada PIX enviado'],
    ['Taxa por Split', cur(d.taxaSplit), 'Por cada operação de split'],
    ['Taxa por Estorno', cur(d.taxaEstorno), 'Por cada estorno solicitado'],
    ['Taxa de Antecipação', `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`, 'Quando solicitada'],
    ['Taxa de Pré-Chargeback', cur(d.taxaPreChargeback), 'Por cada pré-chargeback'],
    ['Taxa de Chargeback', cur(d.taxaChargeback), 'Por cada chargeback gerado'],
    ['Prazo de Recebimento', d.prazoRecebimento, 'Dias após a transação'],
  ];

  return (
    <div className="mb-6">
      <p className="font-semibold text-xs mb-2 uppercase tracking-wide">Tabela MDR (Merchant Discount Rate)</p>
      <table className="w-full border-collapse mb-5 text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className={TH}>Parcelas</th>
            {BRANDS.map(b => <th key={b} className={TH}>{BRAND_LABELS[b]}</th>)}
          </tr>
        </thead>
        <tbody>
          {INSTALLMENTS.map(inst => (
            <tr key={inst}>
              <td className={`${TD} text-center font-medium`}>{inst}x</td>
              {BRANDS.map(b => (
                <td key={b} className={`${TD} text-center`}>{mdrVal(mdrMatrix, b as BrandName, inst as InstallmentNumber)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="font-semibold text-xs mb-2 uppercase tracking-wide">Taxas Operacionais</p>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className={TH}>Serviço</th>
            <th className={TH}>Valor</th>
            <th className={TH}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(([tipo, valor, obs]) => (
            <tr key={tipo}>
              <td className={TD}>{tipo}</td>
              <td className={`${TD} text-center`}>{valor}</td>
              <td className={TD}>{obs}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {parseFloat(d.valorMinimoMensal) > 0 && (
        <p className="text-xs mt-3">
          <span className="font-medium">Valor mínimo mensal:</span>{' '}
          {cur(d.valorMinimoMensal)} — cobrado caso as taxas devidas não atinjam este montante.
        </p>
      )}
    </div>
  );
}
