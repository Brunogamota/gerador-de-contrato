import { cn } from '@/lib/utils';

interface RebornLogoProps {
  className?: string;
  color?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
}

export function RebornMark({ className, color = 'currentColor', size = 32 }: { className?: string; color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.49)}
      viewBox="0 0 210 102"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Reborn logo mark"
    >
      {/* Main diagonal bar – bottom-center to top-right */}
      <polygon points="72,102 96,102 210,0 186,0" fill={color} />
      {/* Left chevron / accent arrow */}
      <polygon points="0,51 42,28 56,40 42,51 56,63 38,72" fill={color} />
    </svg>
  );
}

export function RebornLogo({ className, size = 32, showWordmark = true, wordmarkColor }: RebornLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <RebornMark size={size} />
      {showWordmark && (
        <span
          className="font-bold tracking-tight leading-none"
          style={{
            fontSize: size * 0.56,
            color: wordmarkColor ?? 'currentColor',
            letterSpacing: '-0.02em',
          }}
        >
          rebornpay
        </span>
      )}
    </div>
  );
}
