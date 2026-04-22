import React from 'react';
import { ContractData } from '@/types/contract';
import { MDRMatrix, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber } from '@/types/pricing';
import { INSTALLMENT_LABELS, mdrBaseStr, mdrAntStr, mdrFinalStr, cur } from './formatters';
import { BrandLogo } from './BrandLogo';

interface Props {
  d: ContractData;
  mdrMatrix: MDRMatrix;
}

const S = {
  th:    'border border-gray-300 px-2 py-2 font-semibold bg-gray-50 text-gray-700',
  thSub: 'border border-gray-300 px-1 py-1.5 font-medium bg-gray-50 text-gray-600 text-center',
  td:    'border border-gray-300 px-2 py-1.5 text-gray-800',
  tdNum: 'border border-gray-300 px-1 py-1.5 text-center text-gray-800 font-mono',
};

// Split brands into two rows so each table fits A4 width legibly
const BRANDS_ROW1 = ['visa', 'mastercard', 'elo']      as BrandName[];
const BRANDS_ROW2 = ['amex', 'hipercard']              as BrandName[];

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
        {[...BRANDS_ROW1, ...BRANDS_ROW2].map((b) => <BrandLogo key={b} brand={b} />)}
      </div>

      {/* MDR table split into two rows so every brand fits A4 width */}
      {[BRANDS_ROW1, BRANDS_ROW2].map((row, ri) => (
        <table key={ri} className="w-full border-collapse mb-3" style={{ fontSize: '11px' }}>
          <thead>
            <tr>
              <th className={S.th} style={{ width: '22%', textAlign: 'left', fontSize: '11px' }}>Modo</th>
              {row.map((b) => (
                <th key={b} className={S.th} colSpan={3} style={{ textAlign: 'center', borderBottom: 'none', fontSize: '11px' }}>
                  {BRAND_LABELS[b]}
                </th>
              ))}
            </tr>
            <tr>
              <th className={S.thSub} style={{ textAlign: 'left', borderTop: 'none', fontSize: '10px' }} />
              {row.map((b) => (
                <React.Fragment key={b}>
                  <th className={S.thSub} style={{ fontSize: '10px' }}>Transação (%)</th>
                  <th className={S.thSub} style={{ fontSize: '10px' }}>Antecipação (%)</th>
                  <th className={S.thSub} style={{ fontWeight: 700, color: '#111827', fontSize: '10px' }}>Taxa (%)</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {INSTALLMENTS.map((inst, i) => (
              <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td className={S.td} style={{ fontSize: '11px' }}>{INSTALLMENT_LABELS[inst as number]}</td>
                {row.map((b) => (
                  <React.Fragment key={b}>
                    <td className={S.tdNum} style={{ fontSize: '11px' }}>{mdrBaseStr(mdrMatrix, b, inst as InstallmentNumber)}</td>
                    <td className={S.tdNum} style={{ fontSize: '11px' }}>{mdrAntStr(mdrMatrix, b, inst as InstallmentNumber)}</td>
                    <td className={S.tdNum} style={{ fontWeight: 600, fontSize: '11px' }}>{mdrFinalStr(mdrMatrix, b, inst as InstallmentNumber)}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}

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
