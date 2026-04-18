import path from 'path';
import { fileURLToPath } from 'url';

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
  webpack(config, { dev, isServer }) {
    if (!isServer) {
      config.resolve.alias['react-hook-form'] =
        path.resolve(__dirname, 'node_modules/react-hook-form/dist/index.esm.mjs');
    }

    // In dev mode, keep the webpack runtime in a single chunk so __webpack_require__.n
    // is always present when CJS modules (React, react-hook-form) are loaded during
    // client-side navigation.
    if (dev && !isServer) {
      config.optimization.runtimeChunk = false;
    }

    return config;
  },
};

export default nextConfig;
