import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  webpack(config, { dev, isServer }) {
    if (!isServer) {
      // Force ESM build of react-hook-form to avoid CJS interop __webpack_require__.n
      config.resolve.alias['react-hook-form'] =
        path.resolve(__dirname, 'node_modules/react-hook-form/dist/index.esm.mjs');
    }
    // Keep webpack runtime in a single chunk in dev so __webpack_require__.n is always
    // present during client-side navigation to pages that use CJS modules (React).
    if (dev && !isServer) {
      config.optimization.runtimeChunk = false;
    }
    return config;
  },
};

export default nextConfig;
