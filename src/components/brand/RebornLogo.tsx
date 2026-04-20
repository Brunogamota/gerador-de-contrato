import { cn } from '@/lib/utils';

interface RebornMarkProps {
  className?: string;
  color?: string;
  size?: number;
}

export function RebornMark({ className, color = 'currentColor', size = 32 }: RebornMarkProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.49)}
      viewBox="4 0 210 102"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Reborn logo mark"
    >
      <polygon points="72,102 96,102 210,0 186,0" fill={color} />
      <polygon points="0,51 42,28 56,40 42,51 56,63 38,72" fill={color} />
    </svg>
  );
}

/**
 * Full horizontal wordmark — mark + "REBORN" — for use on light/white backgrounds.
 * Self-contained SVG, no external file needed.
 */
export function RebornWordmark({
  height = 32,
  color = '#0a0a0a',
  className,
}: {
  height?: number;
  color?: string;
  className?: string;
}) {
  // Canvas: 820 × 160 logical units
  // Mark: 0-170, gap 30, text "REBORN" from 200
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 820 160"
      height={height}
      width="auto"
      style={{ display: 'block' }}
      className={className}
      aria-label="Reborn"
    >
      {/* Mark – diagonal bar */}
      <polygon points="52,158 76,158 170,2 146,2" fill={color} />
      {/* Mark – left chevron/arrow */}
      <polygon points="0,80 44,52 58,65 44,80 58,95 40,106" fill={color} />

      {/* Wordmark – REBORN in heavy condensed style */}
      <text
        x="195"
        y="145"
        fontFamily="'Arial Black', 'Impact', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="900"
        fontSize="155"
        letterSpacing="-3"
        fill={color}
      >
        REBORN
      </text>
    </svg>
  );
}

interface RebornLogoProps {
  className?: string;
  color?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
}

export function RebornLogo({
  className,
  size = 32,
  showWordmark = true,
  wordmarkColor,
}: RebornLogoProps) {
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
