import React from 'react';
import { ContractData } from '@/types/contract';
import { MDRMatrix, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { cur } from './formatters';
import { BrandLogo } from '@/components/shared/BrandLogo';

interface Props {
  d: ContractData;
  mdrMatrix: MDRMatrix;
}

/* ─── Reborn brand identity ───────────────────────────────────────────────── */
const font   = "'Archivo', 'Arial', Helvetica, sans-serif";
const ink    = '#161419';
const ink2   = '#2d2933';
const silver = '#ededf7';
const brand  = '#f72662';
const muted  = '#9a8fa8';
const border = `1px solid ${silver}`;

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

function getFinal(matrix: MDRMatrix, b: BrandName, inst: InstallmentNumber): string {
  const v = matrix[b]?.[inst]?.finalMdr;
  if (!v || parseFloat(v) <= 0) return '—';
  return `${parseFloat(v).toFixed(2).replace('.', ',')}%`;
}

export function ContractAnnexII({ d, mdrMatrix }: Props) {
  const fees: [string, string, string][] = [
    ['Setup',                  cur(d.setup),                                                     'Valor único na assinatura'],
    ['Fee por Transação',      cur(d.feeTransacao),                                              'Por transação processada'],
    ['Taxa de Antifraude',     cur(d.taxaAntifraude),                                            'Por transação verificada'],
    ['Taxa PIX In',            cur(d.taxaPix),                                                   'Por PIX recebido'],
    ['Taxa PIX Out',           cur(d.taxaPixOut),                                                'Por PIX enviado'],
    ['Taxa por Split',         cur(d.taxaSplit),                                                 'Por split criado'],
    ['Taxa por Estorno',       cur(d.taxaEstorno),                                               'Por estorno solicitado'],
    ['Taxa de Antecipação',      `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`,  'Quando solicitada'],
    ['Limite de Antecipação',    `${parseFloat(d.limiteAntecipacao ?? '100').toFixed(0)}%`,          'Do volume antecipável'],
    ['Taxa de Autenticação 3DS', cur(d.taxa3ds ?? '0.00'),                                           'Por tentativa 3D Secure'],
    ['Taxa de Pré-Chargeback',   cur(d.taxaPreChargeback),                                           'Por pré-chargeback'],
    ['Taxa de Chargeback',     cur(d.taxaChargeback),                                            'Por chargeback gerado'],
    ['Prazo de Recebimento',   d.prazoRecebimento,                                               'Dias úteis após a transação'],
  ];

  return (
    <div style={{ fontFamily: font, marginTop: '32px', paddingTop: '24px', borderTop: `2px solid ${silver}`, pageBreakBefore: 'always' }}>

      <p style={{ fontFamily: font, fontSize: '13pt', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em', color: ink, marginBottom: '28px' }}>
        ANEXO II — REMUNERAÇÃO
      </p>

      {/* ── 1. MDR ── */}
      <p style={{ fontFamily: font, fontSize: '11pt', fontWeight: 700, color: ink, marginBottom: '4px' }}>
        1. Taxas MDR — Merchant Discount Rate
      </p>
      <p style={{ fontFamily: font, fontSize: '9pt', color: muted, marginBottom: '16px', lineHeight: '1.5' }}>
        Percentual aplicado sobre o valor bruto de cada transação, por bandeira e número de parcelas.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr>
            <th style={{
              fontFamily: font, fontSize: '8.5pt', fontWeight: 800,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#ffffff', background: ink,
              textAlign: 'center', padding: '16px 10px', border, width: '28%',
            }}>
              Modalidade
            </th>
            {BRANDS.map((b) => (
              <th key={b} style={{ background: '#ffffff', border, padding: '14px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                <BrandLogo brand={b} />
              </th>
            ))}
          </tr>
          <tr style={{ background: silver }}>
            <td style={{ fontFamily: font, fontSize: '7.5pt', color: muted, fontStyle: 'italic', padding: '5px 14px', border }}>
              Taxa Final (MDR)
            </td>
            {BRANDS.map((b) => (
              <td key={b} style={{ fontFamily: font, fontSize: '7.5pt', color: muted, fontStyle: 'italic', textAlign: 'center', padding: '5px 6px', border }}>
                Taxa Final
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {INSTALLMENTS.map((inst, i) => (
            <tr key={inst} style={{ background: i % 2 === 0 ? '#ffffff' : '#faf9fc' }}>
              <td style={{ padding: '11px 14px', border }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    display: 'inline-block', background: brand, color: '#ffffff',
                    borderRadius: '5px', padding: '2px 8px', fontSize: '8pt',
                    fontFamily: font, fontWeight: 700,
                    minWidth: '26px', textAlign: 'center', flexShrink: 0,
                  }}>
                    {INST_NUM[inst as number]}×
                  </span>
                  <span style={{ fontFamily: font, fontSize: '10.5pt', color: ink, fontWeight: i === 0 ? 600 : 400 }}>
                    {INST_LABELS[inst as number]}
                  </span>
                </div>
              </td>
              {BRANDS.map((b) => (
                <td key={b} style={{ textAlign: 'center', padding: '11px 6px', border, verticalAlign: 'middle' }}>
                  <span style={{ fontFamily: font, fontSize: '13pt', fontWeight: 800, color: ink, letterSpacing: '-0.02em' }}>
                    {getFinal(mdrMatrix, b, inst as InstallmentNumber)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 2. Fees ── */}
      <p style={{ fontFamily: font, fontSize: '11pt', fontWeight: 700, color: ink, marginBottom: '4px' }}>
        2. Tabela de Preços Operacionais
      </p>
      <p style={{ fontFamily: font, fontSize: '9pt', color: muted, marginBottom: '12px', lineHeight: '1.5' }}>
        Tarifas fixas e variáveis pelos serviços de gateway, antifraude e liquidação.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: ink }}>
            <th style={{ fontFamily: font, fontSize: '8pt', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: muted,    textAlign: 'left',   padding: '11px 14px', border, width: '38%' }}>Serviço</th>
            <th style={{ fontFamily: font, fontSize: '8pt', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffffff', textAlign: 'center', padding: '11px 14px', border, width: '20%' }}>Valor</th>
            <th style={{ fontFamily: font, fontSize: '8pt', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: muted,    textAlign: 'left',   padding: '11px 14px', border }}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(([tipo, valor, obs], i) => (
            <tr key={tipo} style={{ background: i % 2 === 0 ? '#ffffff' : '#faf9fc' }}>
              <td style={{ fontFamily: font, fontSize: '10.5pt', color: ink2, padding: '10px 14px', border, fontWeight: 500 }}>{tipo}</td>
              <td style={{ fontFamily: font, fontSize: '11pt',   color: ink,  padding: '10px 14px', border, fontWeight: 800, textAlign: 'center' }}>{valor}</td>
              <td style={{ fontFamily: font, fontSize: '9pt',    color: muted, padding: '10px 14px', border, fontStyle: 'italic' }}>{obs}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 3. Volume Condition ── */}
      {d.volumeAnualNegociado && (
        <div style={{ marginBottom: '24px', background: '#f0f4ff', border: '1px solid #c7d4f0', borderLeft: `3px solid #4a6cf7`, borderRadius: '4px', padding: '12px 16px' }}>
          <p style={{ fontFamily: font, fontSize: '10.5pt', color: ink2, margin: 0, lineHeight: '1.7' }}>
            <strong>Condição Comercial:</strong> As taxas e tarifas constantes neste Anexo II são condicionadas ao volume anual negociado de{' '}
            <strong style={{ fontSize: '12pt', color: ink, fontWeight: 800 }}>
              R$ {d.volumeAnualNegociado}
            </strong>
            . Em caso de descumprimento do volume mínimo acordado, a REBORN reserva-se o direito de revisar as condições comerciais mediante aviso prévio de 30 (trinta) dias.
          </p>
        </div>
      )}

      {/* ── 4. Minimum monthly ── */}
      <p style={{ fontFamily: font, fontSize: '11pt', fontWeight: 700, color: ink, marginBottom: '8px' }}>
        {d.volumeAnualNegociado ? '4.' : '3.'} Valor Mínimo Mensal
      </p>
      <div style={{ background: '#fff5f8', border: `1px solid ${brand}33`, borderLeft: `3px solid ${brand}`, borderRadius: '4px', padding: '12px 16px' }}>
        <p style={{ fontFamily: font, fontSize: '10.5pt', color: ink2, margin: 0, lineHeight: '1.7' }}>
          O CONTRATANTE concorda em pagar à <strong>REBORN</strong> o valor mínimo mensal de{' '}
          <strong style={{ fontSize: '12pt', color: ink, fontWeight: 800 }}>{cur(d.valorMinimoMensal)}</strong>,
          caso as taxas devidas no período não atinjam este montante.
        </p>
      </div>
    </div>
  );
}
