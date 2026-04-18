/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      'sharp',
      'tesseract.js',
    ],
  },
  // Prevent browsers from caching unhashed dev-mode chunks between dev sessions.
  // Without this, a stale cached webpack.js (missing __webpack_require__.n) can
  // cause "TypeError: __webpack_require__.n is not a function" when the page chunk
  // from a newer session calls .n for CJS modules (React, next/navigation).
  async headers() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      {
        source: '/_next/static/chunks/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
