#!/usr/bin/env node
/**
 * Smoke test — verifica env vars e conectividade com o banco.
 * Usage:
 *   node scripts/smoke.mjs
 *   DATABASE_URL=postgresql://... node scripts/smoke.mjs
 */

const VARS = {
  DATABASE_URL:   { desc: 'Prisma — PostgreSQL (contract storage)',  required: true  },
  DIRECT_URL:     { desc: 'Prisma — direct connection (migrations)', required: false },
  OPENAI_API_KEY: { desc: 'OpenAI — PDF MDR parsing',                required: false },
};

let allRequiredOk = true;

console.log('\n── Env vars ──────────────────────────────────────');
for (const [key, { desc, required }] of Object.entries(VARS)) {
  const set = !!process.env[key];
  if (!set && required) allRequiredOk = false;
  const icon  = set ? '✓' : (required ? '✗' : '·');
  const label = set ? 'set   ' : 'NOT SET';
  console.log(`  ${icon}  ${key.padEnd(22)} ${label}  ${desc}`);
}
console.log('──────────────────────────────────────────────────');

if (!allRequiredOk) {
  console.error('\n✗  Required env vars missing. Set them before deploying.\n');
  process.exit(1);
}

// ── DB connectivity (optional — only when DATABASE_URL is present) ────────────
if (process.env.DATABASE_URL) {
  console.log('\n── DB connectivity ───────────────────────────────');
  try {
    // Dynamically require so the script doesn't crash if @prisma/client isn't built yet.
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({ log: [] });
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 AS ping`;
    await prisma.$disconnect();
    console.log('  ✓  DB ping OK', result);
  } catch (err) {
    console.error('  ✗  DB ping FAILED:', err.message);
    process.exit(1);
  }
  console.log('──────────────────────────────────────────────────');
}

console.log('\n✓  Smoke test passed.\n');
