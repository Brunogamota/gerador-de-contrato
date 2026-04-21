import { BrandName } from '@/types/pricing';

const LOGOS: Record<BrandName, JSX.Element> = {
  visa: (
    <svg width="40" height="26" viewBox="0 0 40 26" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <rect width="40" height="26" rx="3" fill="#1A1F71" />
      <text x="20" y="17" fontFamily="'Helvetica Neue',Arial,sans-serif" fontWeight="bold" fontSize="11" fill="white" textAnchor="middle" letterSpacing="1">VISA</text>
    </svg>
  ),
  mastercard: (
    <svg width="40" height="26" viewBox="0 0 40 26" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <rect width="40" height="26" rx="3" fill="#252525" />
      <circle cx="15" cy="13" r="7.5" fill="#EB001B" />
      <circle cx="25" cy="13" r="7.5" fill="#F79E1B" opacity="0.9" />
    </svg>
  ),
  elo: (
    <svg width="40" height="26" viewBox="0 0 40 26" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <rect width="40" height="26" rx="3" fill="#000" />
      <text x="20" y="17" fontFamily="'Helvetica Neue',Arial,sans-serif" fontWeight="bold" fontSize="12" fill="#FFD600" textAnchor="middle">elo</text>
    </svg>
  ),
  amex: (
    <svg width="40" height="26" viewBox="0 0 40 26" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <rect width="40" height="26" rx="3" fill="#007BC1" />
      <text x="20" y="16" fontFamily="'Helvetica Neue',Arial,sans-serif" fontWeight="bold" fontSize="9" fill="white" textAnchor="middle" letterSpacing="0.5">AMEX</text>
    </svg>
  ),
  hipercard: (
    <svg width="40" height="26" viewBox="0 0 40 26" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <rect width="40" height="26" rx="3" fill="#CC092F" />
      <text x="20" y="16" fontFamily="'Helvetica Neue',Arial,sans-serif" fontWeight="bold" fontSize="8" fill="white" textAnchor="middle" letterSpacing="0.3">hiper</text>
    </svg>
  ),
};

export function BrandLogo({ brand }: { brand: BrandName }) {
  return LOGOS[brand];
}
