import React from 'react';
import { ContractData } from '@/types/contract';
import { MDRMatrix, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { cur } from './formatters';
import { BrandLogo } from '@/components/shared/BrandLogo';

interface Props {
  d: ContractData;
  mdrMatrix: MDRMatrix;
}

const BRANDS: BrandName[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'];

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

function getFinal(matrix: MDRMatrix, brand: BrandName, inst: InstallmentNumber): string {
  const v = matrix[brand]?.[inst]?.finalMdr;
  if (!v || parseFloat(v) <= 0) return '—';
  return `${parseFloat(v).toFixed(2).replace('.', ',')}%`;
}

const f = 'Arial, Helvetica, sans-serif';
const border = '1px solid #e2e8f0';

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
    <div style={{ fontFamily: f, marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #cbd5e1', pageBreakBefore: 'always' }}>

      <p style={{ fontFamily: f, fontSize: '13pt', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0f172a', marginBottom: '28px' }}>
        ANEXO II — REMUNERAÇÃO
      </p>

      {/* ── 1. MDR ── */}
      <p style={{ fontFamily: f, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
        1. Taxas MDR — Merchant Discount Rate
      </p>
      <p style={{ fontFamily: f, fontSize: '9pt', color: '#64748b', marginBottom: '12px' }}>
        Percentual aplicado sobre o valor bruto de cada transação, por bandeira e número de parcelas.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr>
            <th style={{
              fontFamily: f, fontSize: '10pt', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#ffffff', background: '#1e3a5f',
              textAlign: 'center', padding: '14px 12px', border, width: '26%',
            }}>
              Modalidade
            </th>
            {BRANDS.map((brand) => (
              <th key={brand} style={{ background: '#ffffff', border, padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                <BrandLogo brand={brand} />
              </th>
            ))}
          </tr>
          <tr style={{ background: '#f1f5f9' }}>
            <td style={{ fontFamily: f, fontSize: '8pt', color: '#64748b', fontStyle: 'italic', padding: '5px 12px', border }}>
              Taxa Final (MDR)
            </td>
            {BRANDS.map((brand) => (
              <td key={brand} style={{ fontFamily: f, fontSize: '8pt', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '5px 8px', border }}>
                Taxa Final
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
                    background: '#1e3a8a', color: '#ffffff', borderRadius: '5px',
                    padding: '3px 7px', fontSize: '8.5pt', fontWeight: 700, fontFamily: f,
                    minWidth: '28px', textAlign: 'center', flexShrink: 0,
                  }}>
                    {INST_BADGE[inst as number]}
                  </div>
                  <span style={{ fontFamily: f, fontSize: '10.5pt', color: '#374151', fontWeight: i === 0 ? 600 : 400 }}>
                    {INST_LABELS[inst as number]}
                  </span>
                </div>
              </td>
              {BRANDS.map((brand) => (
                <td key={brand} style={{ fontFamily: 'monospace', fontSize: '12pt', fontWeight: 700, color: '#0f172a', textAlign: 'center', padding: '10px 8px', border }}>
                  {getFinal(mdrMatrix, brand, inst as InstallmentNumber)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 2. Fees ── */}
      <p style={{ fontFamily: f, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
        2. Tabela de Preços Operacionais
      </p>
      <p style={{ fontFamily: f, fontSize: '9pt', color: '#64748b', marginBottom: '12px' }}>
        Tarifas fixas e variáveis pelos serviços de gateway, antifraude e liquidação.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
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

      {/* ── 3. Minimum monthly ── */}
      <p style={{ fontFamily: f, fontSize: '11pt', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
        3. Valor Mínimo Mensal
      </p>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #1e3a5f', borderRadius: '4px', padding: '12px 16px' }}>
        <p style={{ fontFamily: f, fontSize: '10.5pt', color: '#334155', margin: 0, lineHeight: '1.7' }}>
          O CONTRATANTE concorda em pagar à <strong>REBORN</strong> o valor mínimo mensal de{' '}
          <strong style={{ fontSize: '12pt', color: '#0f172a' }}>{cur(d.valorMinimoMensal)}</strong>,
          caso as taxas devidas no período não atinjam este montante.
        </p>
      </div>
    </div>
  );
}
