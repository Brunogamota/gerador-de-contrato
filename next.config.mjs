/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      '@google/generative-ai',
      'openai',
    ],
  },
};

export default nextConfig;
