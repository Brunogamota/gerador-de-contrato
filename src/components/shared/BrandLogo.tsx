import React from 'react';
import { BrandName } from '@/types/pricing';

/* No card shapes — just the authentic brand marks */
export function BrandLogo({ brand }: { brand: BrandName }) {
  switch (brand) {

    case 'visa':
      return (
        <svg width="66" height="24" viewBox="0 0 66 24" style={{ display: 'block', margin: '0 auto' }}>
          <text
            x="2" y="22"
            fontFamily="Arial Black, Arial, Helvetica, sans-serif"
            fontSize="24" fontWeight="900" fontStyle="italic" fill="#1A1F71"
          >
            VISA
          </text>
        </svg>
      );

    case 'mastercard':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <svg width="50" height="32" viewBox="0 0 50 32" style={{ display: 'block' }}>
            <circle cx="16" cy="16" r="14" fill="#EB001B" />
            <circle cx="34" cy="16" r="14" fill="#FF5F00" fillOpacity="0.92" />
          </svg>
          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
            mastercard
          </span>
        </div>
      );

    case 'elo': {
      const cx = 17, cy = 17, r = 15, ri = 8;
      const bp = `M${cx},${cy} L${cx},${cy - r} A${r},${r},0,0,1,${cx + r},${cy} Z`;
      const rx2 = +(cx + r * Math.cos((120 * Math.PI) / 180)).toFixed(2);
      const ry2 = +(cy + r * Math.sin((120 * Math.PI) / 180)).toFixed(2);
      const rp = `M${cx},${cy} L${cx + r},${cy} A${r},${r},0,0,1,${rx2},${ry2} Z`;
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="34" height="34" viewBox="0 0 34 34" style={{ display: 'block', flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={r} fill="#FFE01B" />
            <path d={bp} fill="#00A4E0" />
            <path d={rp} fill="#CC0000" />
            <circle cx={cx} cy={cy} r={ri} fill="white" />
          </svg>
          <span style={{ fontFamily: 'Arial Black, Arial, Helvetica, sans-serif', fontSize: '14pt', fontWeight: 900, color: '#111' }}>
            elo
          </span>
        </div>
      );
    }

    case 'amex':
      return (
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
          background: '#006FCF', borderRadius: '6px', padding: '8px 16px', gap: '1px',
        }}>
          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt', fontWeight: 700, color: 'white', letterSpacing: '1.8px', lineHeight: '1.3' }}>AMERICAN</span>
          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt', fontWeight: 700, color: 'white', letterSpacing: '1.8px', lineHeight: '1.3' }}>EXPRESS</span>
        </div>
      );

    case 'hipercard':
      return (
        <div style={{
          display: 'inline-block',
          background: '#C8102E', borderRadius: '6px', padding: '9px 16px',
        }}>
          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', fontWeight: 700, color: 'white', letterSpacing: '0.2px' }}>
            Hipercard
          </span>
        </div>
      );
  }
}
