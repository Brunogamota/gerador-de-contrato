'use client';

export function HardNavLink({ href, className, style, children }: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    return (
      <a href={href} className={className} style={style}
        onClick={(e) => { e.preventDefault(); window.location.href = href; }}>
        {children}
      </a>
    );
  }
  return <a href={href} className={className} style={style}>{children}</a>;
}
