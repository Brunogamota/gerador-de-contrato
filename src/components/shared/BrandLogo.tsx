import React from 'react';
import { BrandName } from '@/types/pricing';

const f = 'Arial, Helvetica, sans-serif';
const fb = 'Arial Black, Arial, Helvetica, sans-serif';

export function BrandLogo({ brand }: { brand: BrandName }) {
  switch (brand) {
    case 'visa':
      return (
        <svg width="66" height="42" viewBox="0 0 66 42" style={{ display: 'block', margin: '0 auto' }}>
          <rect width="66" height="42" rx="6" fill="#1A1F71" />
          <text x="33" y="29" textAnchor="middle" fill="#FFFFFF"
            fontFamily={fb} fontSize="22" fontWeight="900" fontStyle="italic">
            VISA
          </text>
        </svg>
      );

    case 'mastercard':
      return (
        <svg width="66" height="42" viewBox="0 0 66 42" style={{ display: 'block', margin: '0 auto' }}>
          <rect width="66" height="42" rx="6" fill="#1c1c1c" />
          <circle cx="25" cy="18" r="12" fill="#EB001B" />
          <circle cx="41" cy="18" r="12" fill="#FF5F00" fillOpacity="0.92" />
          <text x="33" y="37" textAnchor="middle" fill="#FFFFFF"
            fontFamily={f} fontSize="7" fontWeight="600" letterSpacing="0.5">
            mastercard
          </text>
        </svg>
      );

    case 'elo': {
      const cx = 21, cy = 17, r = 11, ri = 6;
      const bluePath = `M${cx},${cy} L${cx},${cy - r} A${r},${r},0,0,1,${cx + r},${cy} Z`;
      const rx2 = +(cx + r * Math.cos((120 * Math.PI) / 180)).toFixed(2);
      const ry2 = +(cy + r * Math.sin((120 * Math.PI) / 180)).toFixed(2);
      const redPath = `M${cx},${cy} L${cx + r},${cy} A${r},${r},0,0,1,${rx2},${ry2} Z`;
      return (
        <svg width="66" height="42" viewBox="0 0 66 42" style={{ display: 'block', margin: '0 auto' }}>
          <rect width="66" height="42" rx="6" fill="#1c1c1c" />
          <circle cx={cx} cy={cy} r={r} fill="#FFE01B" />
          <path d={bluePath} fill="#00A4E0" />
          <path d={redPath} fill="#CC0000" />
          <circle cx={cx} cy={cy} r={ri} fill="white" />
          <text x="48" y="21" textAnchor="middle" fill="white"
            fontFamily={fb} fontSize="13" fontWeight="900">
            elo
          </text>
        </svg>
      );
    }

    case 'amex':
      return (
        <svg width="66" height="42" viewBox="0 0 66 42" style={{ display: 'block', margin: '0 auto' }}>
          <rect width="66" height="42" rx="6" fill="#006FCF" />
          <text x="33" y="17" textAnchor="middle" fill="white"
            fontFamily={f} fontSize="8" fontWeight="700" letterSpacing="1.5">
            AMERICAN
          </text>
          <text x="33" y="29" textAnchor="middle" fill="white"
            fontFamily={f} fontSize="8" fontWeight="700" letterSpacing="1.5">
            EXPRESS
          </text>
          <text x="33" y="39" textAnchor="middle" fill="rgba(255,255,255,0.45)"
            fontFamily={f} fontSize="5.5" fontWeight="500" letterSpacing="1">
            &#9733; CENTURION CARD &#9733;
          </text>
        </svg>
      );

    case 'hipercard':
      return (
        <svg width="66" height="42" viewBox="0 0 66 42" style={{ display: 'block', margin: '0 auto' }}>
          <rect width="66" height="42" rx="6" fill="#C8102E" />
          {/* H lettermark */}
          <line x1="17" y1="9" x2="17" y2="27" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="27" y1="9" x2="27" y2="27" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="17" y1="18" x2="27" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <text x="47" y="22" textAnchor="middle" fill="white"
            fontFamily={f} fontSize="9.5" fontWeight="700">
            Hiper
          </text>
          <text x="47" y="33" textAnchor="middle" fill="white"
            fontFamily={f} fontSize="9.5" fontWeight="700">
            card
          </text>
        </svg>
      );
  }
}
