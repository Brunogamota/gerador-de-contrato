import type { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | null;
};

export function getPrisma(): PrismaClient | null {
  if (globalForPrisma.prisma !== undefined) return globalForPrisma.prisma;

  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL not set — database features disabled');
    globalForPrisma.prisma = null;
    return null;
  }

  try {
    const { PrismaClient: Client } = require('@prisma/client') as typeof import('@prisma/client');
    const client = new Client({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }
    return client;
  } catch (e) {
    console.warn('[db] Failed to initialize PrismaClient:', e);
    globalForPrisma.prisma = null;
    return null;
  }
}
