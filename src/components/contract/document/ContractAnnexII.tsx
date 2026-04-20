import { ContractData } from '@/types/contract';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber } from '@/types/pricing';
import { TD, TH, mdrVal, cur } from './formatters';

interface Props {
  d: ContractData;
  mdrMatrix: MDRMatrix;
}

export function ContractAnnexII({ d, mdrMatrix }: Props) {
  const fees: [string, string, string][] = [
    ['Setup', cur(d.setup), 'Valor único devido na assinatura'],
    ['Fee por Transação', cur(d.feeTransacao), 'Por cada Transação processada'],
    ['Taxa de Antifraude', cur(d.taxaAntifraude), 'Por transação verificada'],
    ['Taxa PIX In', cur(d.taxaPix), 'Por cada Transação PIX processada'],
    ['Taxa PIX Out', cur(d.taxaPixOut), 'Por cada PIX Out processado'],
    ['Taxa por Split', cur(d.taxaSplit), 'Por cada split criado'],
    ['Taxa por Estorno', cur(d.taxaEstorno), 'Por cada estorno solicitado'],
    ['Taxa de Antecipação', `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`, 'Quando solicitada pelo CONTRATANTE'],
    ['Taxa de Pré-Chargeback', cur(d.taxaPreChargeback), 'Por cada Pré-Chargeback'],
    ['Taxa de Chargeback', cur(d.taxaChargeback), 'Por cada Chargeback gerado'],
    ['Prazo de Recebimento', d.prazoRecebimento, 'Dias úteis após a Transação'],
  ];

  return (
    <div className="mt-8 pt-6 border-t-2 border-gray-400 break-before-page">
      <p className="font-bold text-center text-xs uppercase mb-4">ANEXO II – REMUNERAÇÃO</p>

      <p className="font-semibold text-xs mb-2">1. TABELA DE MDR (Merchant Discount Rate)</p>
      <table className="w-full border-collapse mb-4 text-xs">
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

      <p className="font-semibold text-xs mb-2">2. TABELA DE PREÇOS OPERACIONAIS</p>
      <table className="w-full border-collapse mb-4 text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className={TH}>Tipo de Serviço</th>
            <th className={TH}>Valor</th>
            <th className={TH}>Observações</th>
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

      <p className="font-semibold text-xs mb-1">3. VALOR MÍNIMO MENSAL</p>
      <p className="text-xs mb-4">O CONTRATANTE concorda em pagar à REBORN um valor mínimo mensal de {cur(d.valorMinimoMensal)}, caso as taxas devidas não atinjam este montante.</p>
    </div>
  );
}
