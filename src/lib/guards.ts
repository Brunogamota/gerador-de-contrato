import { BRANDS } from '@/types/pricing';

// Returns true if v looks like a valid MDRMatrix (all 5 brand keys present as objects).
// Lightweight — does not check every installment cell.
export function isMdrMatrix(v: unknown): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  return BRANDS.every(b => b in obj && obj[b] !== null && typeof obj[b] === 'object');
}

// Fields that must never be written via PATCH (computed / identity columns).
const PATCH_PROTECTED = new Set(['id', 'contractNumber', 'proposalNumber', 'createdAt', 'updatedAt']);

export function sanitizePatch(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([k]) => !PATCH_PROTECTED.has(k)));
}
