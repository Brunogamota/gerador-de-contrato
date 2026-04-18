import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // html2canvas ships a UMD bundle as its `browser` field, which causes
      // webpack to generate __webpack_require__.n (CJS default interop) calls.
      // In dev mode the lazy-compiled page chunk may reference .n before the
      // runtime defines it. Force the ESM build to eliminate the interop call.
      config.resolve.alias['html2canvas'] = path.resolve(
        __dirname,
        'node_modules/html2canvas/dist/html2canvas.esm.js'
      );
    }
    return config;
  },
};

export default nextConfig;
