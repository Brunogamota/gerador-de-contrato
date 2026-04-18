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
  webpack(config, { isServer }) {
    if (!isServer) {
      // Force ESM build of react-hook-form to avoid CJS interop __webpack_require__.n error
      config.resolve.alias['react-hook-form'] =
        path.resolve(__dirname, 'node_modules/react-hook-form/dist/index.esm.mjs');
    }
    return config;
  },
};

export default nextConfig;
