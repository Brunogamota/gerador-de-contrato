import React from 'react';
import { ContractData } from '@/types/contract';
import { MDRMatrix, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { cur } from './formatters';

interface Props {
  d: ContractData;
  mdrMatrix: MDRMatrix;
}

const BRANDS: { key: BrandName; label: string; color: string; bg: string }[] = [
  { key: 'visa',       label: 'Visa',       color: '#1a56db', bg: '#EFF6FF' },
  { key: 'mastercard', label: 'Mastercard', color: '#b45309', bg: '#FFFBEB' },
  { key: 'elo',        label: 'Elo',        color: '#b91c1c', bg: '#FEF2F2' },
  { key: 'amex',       label: 'Amex',       color: '#065f46', bg: '#ECFDF5' },
  { key: 'hipercard',  label: 'Hipercard',  color: '#7c3aed', bg: '#F5F3FF' },
];

const INSTALLMENT_LABELS: Record<number, string> = {
  1:  'À vista (1×)',       2:  'Parcelado 2×',
  3:  'Parcelado 3×',       4:  'Parcelado 4×',
  5:  'Parcelado 5×',       6:  'Parcelado 6×',
  7:  'Parcelado 7×',       8:  'Parcelado 8×',
  9:  'Parcelado 9×',       10: 'Parcelado 10×',
  11: 'Parcelado 11×',      12: 'Parcelado 12×',
};

function getFinalRate(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber): string {
  const v = matrix[brand]?.[inst]?.finalMdr;
  if (!v || parseFloat(v) <= 0) return '—';
  return `${parseFloat(v).toFixed(2).replace('.', ',')}%`;
}

function getMdrBase(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber): string {
  const v = matrix[brand]?.[inst]?.mdrBase;
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '—';
}

function getAntRate(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber): string {
  const v = matrix[brand]?.[inst]?.anticipationRate;
  return v && parseFloat(v) > 0 ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '—';
}

const cell  = 'border border-gray-200 text-center font-mono';
const label = 'border border-gray-200 px-4 py-2.5 text-left font-sans';

export function ContractAnnexII({ d, mdrMatrix }: Props) {
  const fees: [string, string, string][] = [
    ['Setup',                  cur(d.setup),                                                     'Valor único na assinatura'],
    ['Fee por Transação',      cur(d.feeTransacao),                                              'Por transação processada'],
    ['Taxa de Antifraude',     cur(d.taxaAntifraude),                                            'Por transação verificada'],
    ['Taxa PIX In',            cur(d.taxaPix),                                                   'Por PIX recebido'],
    ['Taxa PIX Out',           cur(d.taxaPixOut),                                                'Por PIX enviado'],
    ['Taxa por Split',         cur(d.taxaSplit),                                                 'Por split criado'],
    ['Taxa por Estorno',       cur(d.taxaEstorno),                                               'Por estorno solicitado'],
    ['Taxa de Antecipação',    `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`, 'Quando solicitada'],
    ['Taxa de Pré-Chargeback', cur(d.taxaPreChargeback),                                         'Por pré-chargeback'],
    ['Taxa de Chargeback',     cur(d.taxaChargeback),                                            'Por chargeback gerado'],
    ['Prazo de Recebimento',   d.prazoRecebimento,                                               'Dias úteis após a transação'],
  ];

  return (
    <div
      className="mt-8 pt-6 border-t-2 border-gray-300 break-before-page"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* ── Section title ── */}
      <p
        className="font-bold text-center uppercase mb-6"
        style={{ fontSize: '13pt', letterSpacing: '0.05em', color: '#111827' }}
      >
        ANEXO II — REMUNERAÇÃO
      </p>

      {/* ── 1. MDR table ── */}
      <p className="font-bold mb-1" style={{ fontSize: '12pt', color: '#111827' }}>
        1. Taxas MDR — Merchant Discount Rate
      </p>
      <p className="mb-4 text-gray-500" style={{ fontSize: '10pt' }}>
        Valores em percentual (%) sobre o volume transacionado. A Taxa Final é a soma da MDR Base e da Antecipação.
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 mb-2" style={{ fontSize: '12.5pt' }}>
        <table className="w-full border-collapse">
          {/* Column headers */}
          <thead>
            <tr>
              <th
                className="border border-gray-200 px-4 py-3 text-left font-bold bg-gray-800 text-white"
                style={{ width: '22%', fontSize: '11.5pt' }}
              >
                Modalidade
              </th>
              {BRANDS.map((b) => (
                <th
                  key={b.key}
                  className="border border-gray-200 py-3 text-center font-bold"
                  style={{ width: '15.6%', background: b.bg, color: b.color, fontSize: '11.5pt' }}
                >
                  {b.label}
                </th>
              ))}
            </tr>
            {/* Sub-header: MDR base / Ant / Taxa */}
            <tr style={{ background: '#f9fafb' }}>
              <td className="border border-gray-200 px-4 py-1.5 text-xs text-gray-400 italic">
                Transação · Antecipação · <strong>Taxa final</strong>
              </td>
              {BRANDS.map((b) => (
                <td
                  key={b.key}
                  className="border border-gray-200 py-1.5 text-center text-gray-400 italic"
                  style={{ fontSize: '9pt' }}
                >
                  MDR base · Ant. · <strong>Final</strong>
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {INSTALLMENTS.map((inst, i) => (
              <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td className={label} style={{ fontSize: '11.5pt', color: '#374151', fontWeight: i === 0 ? 600 : 400 }}>
                  {INSTALLMENT_LABELS[inst as number]}
                </td>
                {BRANDS.map((b) => {
                  const base = getMdrBase(mdrMatrix, b.key, inst as InstallmentNumber);
                  const ant  = getAntRate(mdrMatrix, b.key, inst as InstallmentNumber);
                  const taxa = getFinalRate(mdrMatrix, b.key, inst as InstallmentNumber);
                  return (
                    <td key={b.key} className={cell} style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                      {/* Three values stacked: base · ant · FINAL */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        <span style={{ fontSize: '9pt', color: '#9ca3af' }}>{base} · {ant}</span>
                        <span style={{ fontSize: '13pt', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                          {taxa}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mb-8 text-gray-400 italic" style={{ fontSize: '9pt' }}>
        * As taxas acima são aplicadas sobre o valor bruto de cada transação conforme a bandeira e o número de parcelas.
      </p>

      {/* ── 2. Operational fees ── */}
      <p className="font-bold mb-1" style={{ fontSize: '12pt', color: '#111827' }}>
        2. Tabela de Preços Operacionais
      </p>
      <p className="mb-4 text-gray-500" style={{ fontSize: '10pt' }}>
        Tarifas fixas e variáveis cobradas pelos serviços de gateway, antifraude e liquidação.
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 mb-2" style={{ fontSize: '12pt' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: '#1f2937' }}>
              <th className="border border-gray-300 px-4 py-3 text-left font-bold text-white" style={{ width: '38%', fontSize: '11pt' }}>
                Tipo de Serviço
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-bold text-white" style={{ width: '22%', fontSize: '11pt' }}>
                Valor
              </th>
              <th className="border border-gray-300 px-4 py-3 text-left font-bold text-white" style={{ fontSize: '11pt' }}>
                Observação
              </th>
            </tr>
          </thead>
          <tbody>
            {fees.map(([tipo, valor, obs], i) => (
              <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td className="border border-gray-200 px-4 py-2.5 font-medium text-gray-800" style={{ fontSize: '11.5pt' }}>
                  {tipo}
                </td>
                <td className="border border-gray-200 px-4 py-2.5 text-center font-mono font-bold text-gray-900" style={{ fontSize: '12pt' }}>
                  {valor}
                </td>
                <td className="border border-gray-200 px-4 py-2.5 text-gray-500 italic" style={{ fontSize: '10pt' }}>
                  {obs}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 3. Minimum monthly value ── */}
      <div
        className="mt-8 px-5 py-4 rounded-lg border border-gray-200"
        style={{ background: '#f9fafb' }}
      >
        <p className="font-bold mb-1" style={{ fontSize: '12pt', color: '#111827' }}>
          3. Valor Mínimo Mensal
        </p>
        <p style={{ fontSize: '11.5pt', color: '#374151', lineHeight: '1.7' }}>
          O CONTRATANTE concorda em pagar à <strong>REBORN</strong> o valor mínimo mensal de{' '}
          <strong style={{ fontSize: '13pt', color: '#111827' }}>{cur(d.valorMinimoMensal)}</strong>,
          caso as taxas devidas no período não atinjam este montante.
        </p>
      </div>
    </div>
  );
}
