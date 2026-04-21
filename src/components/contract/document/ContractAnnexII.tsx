import { ContractData } from '@/types/contract';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber } from '@/types/pricing';
import { INSTALLMENT_LABELS, mdrBaseStr, mdrAntStr, mdrFinalStr, cur } from './formatters';
import { BrandLogo } from './BrandLogo';

interface Props {
  d: ContractData;
  mdrMatrix: MDRMatrix;
}

const S = {
  th:    'border border-gray-300 px-3 py-2 text-xs font-semibold bg-gray-50 text-gray-700',
  thSub: 'border border-gray-300 px-2 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 text-center',
  td:    'border border-gray-300 px-3 py-1.5 text-xs text-gray-800',
  tdNum: 'border border-gray-300 px-3 py-1.5 text-xs text-center text-gray-800 font-mono',
  tdAlt: 'border border-gray-200 px-3 py-1.5 text-xs text-center text-gray-800 font-mono',
};

export function ContractAnnexII({ d, mdrMatrix }: Props) {
  const fees: [string, string, string][] = [
    ['Setup',                  cur(d.setup),                                                           'Valor único devido na assinatura'],
    ['Fee por Transação',      cur(d.feeTransacao),                                                    'Por cada Transação processada'],
    ['Taxa de Antifraude',     cur(d.taxaAntifraude),                                                  'Por transação verificada'],
    ['Taxa PIX In',            cur(d.taxaPix),                                                         'Por cada Transação PIX processada'],
    ['Taxa PIX Out',           cur(d.taxaPixOut),                                                      'Por cada PIX Out processado'],
    ['Taxa por Split',         cur(d.taxaSplit),                                                       'Por cada split criado'],
    ['Taxa por Estorno',       cur(d.taxaEstorno),                                                     'Por cada estorno solicitado'],
    ['Taxa de Antecipação',    `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`,       'Quando solicitada pelo CONTRATANTE'],
    ['Taxa de Pré-Chargeback', cur(d.taxaPreChargeback),                                               'Por cada Pré-Chargeback'],
    ['Taxa de Chargeback',     cur(d.taxaChargeback),                                                  'Por cada Chargeback gerado'],
    ['Prazo de Recebimento',   d.prazoRecebimento,                                                     'Dias úteis após a Transação'],
  ];

  return (
    <div className="mt-8 pt-6 border-t-2 border-gray-400 break-before-page">
      <p className="font-bold text-center text-xs uppercase mb-4">ANEXO II – REMUNERAÇÃO</p>

      <p className="font-semibold text-xs mb-3">1. TABELA DE MDR (Merchant Discount Rate)</p>

      {/* Brand logos row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151' }}>Bandeiras:</span>
        {BRANDS.map((b) => <BrandLogo key={b} brand={b as BrandName} />)}
      </div>

      {/* MDR table — all brands × columns: Modo | Transação | Antecipação | Taxa */}
      <table className="w-full border-collapse mb-4" style={{ fontSize: '10px' }}>
        <thead>
          <tr>
            <th className={S.th} style={{ width: '30%', textAlign: 'left' }}>Modo</th>
            {BRANDS.map((b) => (
              <th key={b} className={S.th} colSpan={3} style={{ textAlign: 'center', borderBottom: 'none' }}>
                {BRAND_LABELS[b as BrandName]}
              </th>
            ))}
          </tr>
          <tr>
            <th className={S.thSub} style={{ textAlign: 'left', borderTop: 'none' }} />
            {BRANDS.map((b) => (
              <>
                <th key={`${b}-t`} className={S.thSub}>Transação (%)</th>
                <th key={`${b}-a`} className={S.thSub}>Antecipação (%)</th>
                <th key={`${b}-f`} className={S.thSub} style={{ fontWeight: 700, color: '#111827' }}>Taxa (%)</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {INSTALLMENTS.map((inst, i) => (
            <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
              <td className={S.td}>{INSTALLMENT_LABELS[inst as number]}</td>
              {BRANDS.map((b) => (
                <>
                  <td key={`${b}-t`} className={S.tdNum}>{mdrBaseStr(mdrMatrix, b as BrandName, inst as InstallmentNumber)}</td>
                  <td key={`${b}-a`} className={S.tdNum}>{mdrAntStr(mdrMatrix,  b as BrandName, inst as InstallmentNumber)}</td>
                  <td key={`${b}-f`} className={S.tdNum} style={{ fontWeight: 600 }}>{mdrFinalStr(mdrMatrix, b as BrandName, inst as InstallmentNumber)}</td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="font-semibold text-xs mb-2">2. TABELA DE PREÇOS OPERACIONAIS</p>
      <table className="w-full border-collapse mb-4 text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className={S.th} style={{ width: '35%', textAlign: 'left' }}>Tipo de Serviço</th>
            <th className={S.th} style={{ textAlign: 'center' }}>Valor</th>
            <th className={S.th} style={{ textAlign: 'left' }}>Observações</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(([tipo, valor, obs], i) => (
            <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
              <td className={S.td}>{tipo}</td>
              <td className={S.tdNum}>{valor}</td>
              <td className={S.td} style={{ color: '#6b7280' }}>{obs}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="font-semibold text-xs mb-1">3. VALOR MÍNIMO MENSAL</p>
      <p className="text-xs mb-4">O CONTRATANTE concorda em pagar à REBORN um valor mínimo mensal de {cur(d.valorMinimoMensal)}, caso as taxas devidas não atinjam este montante.</p>
    </div>
  );
}
