'use client';

import { RebornMark } from '@/components/brand/RebornLogo';

const SANS: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

interface FullHeaderProps {
  contractNumber: string;
}

export function FullHeader({ contractNumber }: FullHeaderProps) {
  return (
    <div style={{ marginBottom: '5mm' }}>
      {/* Logo row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3mm' }}>
        {/* Left: brand */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <RebornMark size={38} color="#161419" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13pt', lineHeight: 1, letterSpacing: '-0.02em', ...SANS }}>
              REBORNPAY
            </div>
            <div style={{ fontSize: '7pt', color: '#555', marginTop: '3px', ...SANS }}>
              REBORN TECNOLOGIA E SERVIÇOS LTDA
            </div>
            <div style={{ fontSize: '7pt', color: '#888', marginTop: '1px', ...SANS }}>
              CNPJ 59.627.567/0001-35
            </div>
          </div>
        </div>
        {/* Right: contact */}
        <div style={{ textAlign: 'right', fontSize: '7pt', color: '#666', lineHeight: 1.55, ...SANS }}>
          <div>Av. Brg. Faria Lima, 1572 · Sala 1022</div>
          <div>Ed. Barão de Rothschild · Jardim Paulistano</div>
          <div>São Paulo / SP · CEP 01451-917</div>
          <div style={{ marginTop: '2px' }}>
            <span style={{ color: '#222', fontWeight: 600 }}>juridico@rebornpay.io</span>
            &ensp;·&ensp;(11) 97420-5761
          </div>
        </div>
      </div>

      {/* Brand divider */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, #f72662 0%, #771339 55%, transparent 100%)', marginBottom: '4mm' }} />

      {/* Contract reference below divider */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: '7pt', color: '#888', ...SANS }}>
          Contrato nº&nbsp;<strong style={{ color: '#444' }}>{contractNumber}</strong>
        </div>
      </div>
    </div>
  );
}

interface RunningHeaderProps {
  contractNumber: string;
}

export function RunningHeader({ contractNumber }: RunningHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #ddd',
      paddingBottom: '2mm',
      marginBottom: '4mm',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <RebornMark size={18} color="#f72662" />
        <span style={{ fontSize: '7.5pt', fontWeight: 700, color: '#222', letterSpacing: '0.04em', ...SANS }}>
          REBORNPAY
        </span>
      </div>
      <div style={{ fontSize: '7pt', color: '#888', ...SANS }}>
        Contrato de Prestação de Serviços · nº&nbsp;
        <strong style={{ color: '#555' }}>{contractNumber}</strong>
      </div>
    </div>
  );
}
