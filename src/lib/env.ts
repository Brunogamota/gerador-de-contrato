// Central registry of all environment variables used by this app.
// Import and call checkEnv() in server startup code for a clear boot report.

const VARS = {
  DATABASE_URL:   { desc: 'Prisma — PostgreSQL (contract storage)',  required: true  },
  DIRECT_URL:     { desc: 'Prisma — direct connection (migrations)', required: false },
  OPENAI_API_KEY: { desc: 'OpenAI — PDF MDR parsing',                required: false },
} as const;

type EnvKey = keyof typeof VARS;

export function checkEnv(): { ok: boolean; missing: EnvKey[] } {
  const missing: EnvKey[] = [];
  for (const key of Object.keys(VARS) as EnvKey[]) {
    if (!process.env[key]) {
      missing.push(key);
      const level = VARS[key].required ? 'ERROR' : 'WARN ';
      console.warn(`[env] ${level} ${key} not set — ${VARS[key].desc}`);
    }
  }
  const ok = missing.filter(k => VARS[k].required).length === 0;
  return { ok, missing };
}

// Throws if the env var is not set. Use in code paths that cannot proceed without it.
export function requireEnv(key: EnvKey): string {
  const val = process.env[key];
  if (!val) throw new Error(`[env] ${key} is required but not set — ${VARS[key].desc}`);
  return val;
}
