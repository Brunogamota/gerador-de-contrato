'use client';

/**
 * Replaces Next.js <Link> for /contracts/new navigation.
 * Dev:  forces full page reload via window.location to bypass the
 *       webpack HMR __webpack_require__.n interop bug on client-side nav.
 * Prod: plain <a> — browser handles it; Next.js router prefetching is
 *       not critical for this app's usage pattern.
 */
export function HardNavLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return (
      <a
        href={href}
        className={className}
        style={style}
        onClick={(e) => {
          e.preventDefault();
          window.location.href = href;
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}
