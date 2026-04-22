/**
 * Pricing ViewModel — adapter between the Pricing Engine and the UI.
 * The UI never reads the Pricing Engine directly; it always goes through here.
 */

export type PricingBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'pix';
export type MarginHealth = 'healthy' | 'warning' | 'danger';

export const PRICING_BRANDS: PricingBrand[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'pix'];
export const TABLE_INSTALLMENTS = [1, 2, 3, 4, 6, 9, 12] as const;
export type TableInstallment = (typeof TABLE_INSTALLMENTS)[number];

export interface PricingCell {
  cost: number;
  rate: number;
  margin: number;
  health: MarginHealth;
  hasOverride: boolean;
}

export interface PricingProfile {
  id: string;
  name: string;
  badge?: string;
  isActive: boolean;
}

export interface CostCenter {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface FeesAlert {
  type: 'warning' | 'error';
  message: string;
}

export interface FeesSummary {
  avgMargin: number;
  avgMarginTarget: number;
  competitiveness: string;
  competitivenessScore: number;
  estimatedImpactMonthly: number;
  alerts: FeesAlert[];
}

export type OverrideMap = Partial<Record<PricingBrand, Partial<Record<TableInstallment, number>>>>;

export type FeesTable = Record<PricingBrand, Partial<Record<TableInstallment, PricingCell>>>;

export interface FeesViewModel {
  profile: PricingProfile;
  costCenter: CostCenter;
  table: FeesTable;
  summary: FeesSummary;
}

// ── Acquirer cost base (source: Pricing Engine / CostProfile) ─────────────────
// These are the actual MDR costs the acquirer charges the merchant.
const ACQUIRER_COSTS: Record<PricingBrand, Partial<Record<TableInstallment, number>>> = {
  visa:       { 1: 1.97, 2: 2.18, 3: 2.39, 4: 2.68, 6: 3.16, 9: 3.82, 12: 4.48 },
  mastercard: { 1: 1.97, 2: 2.18, 3: 2.39, 4: 2.68, 6: 3.16, 9: 3.82, 12: 4.48 },
  elo:        { 1: 1.97, 2: 2.18, 3: 2.49, 4: 2.88, 6: 3.46, 9: 4.12, 12: 4.88 },
  amex:       { 1: 2.47, 2: 2.88, 3: 3.29, 4: 3.78, 6: 4.46, 9: 5.32, 12: 6.28 },
  hipercard:  { 1: 1.97, 2: 2.18, 3: 2.49, 4: 2.88, 6: 3.46, 9: 4.12, 12: 4.88 },
  pix:        { 1: 0.50 },
};

// ── Default client-facing rates (source: active pricing profile) ──────────────
const DEFAULT_CLIENT_RATES: Record<PricingBrand, Partial<Record<TableInstallment, number>>> = {
  visa:       { 1: 2.39, 2: 2.59, 3: 2.79, 4: 3.09, 6: 3.59, 9: 4.29, 12: 4.99 },
  mastercard: { 1: 2.39, 2: 2.59, 3: 2.79, 4: 3.09, 6: 3.59, 9: 4.29, 12: 4.99 },
  elo:        { 1: 2.79, 2: 2.99, 3: 3.29, 4: 3.69, 6: 4.29, 9: 4.99, 12: 5.79 },
  amex:       { 1: 3.89, 2: 4.29, 3: 4.69, 4: 5.19, 6: 5.89, 9: 6.79, 12: 7.79 },
  hipercard:  { 1: 2.79, 2: 2.99, 3: 3.29, 4: 3.69, 6: 4.29, 9: 4.99, 12: 5.79 },
  pix:        { 1: 0.69 },
};

export const PRICING_PROFILES: PricingProfile[] = [
  { id: 'enterprise', name: 'Enterprise Padrão', badge: 'Perfil ativo', isActive: true },
  { id: 'competitive', name: 'Competitivo Plus', isActive: false },
  { id: 'premium', name: 'Premium Margem', isActive: false },
];

export const COST_CENTERS: CostCenter[] = [
  { id: 'dock', name: 'Dock (Adquirente)', type: 'Adquirente', isActive: true },
  { id: 'cielo', name: 'Cielo (Adquirente)', type: 'Adquirente', isActive: false },
  { id: 'stone', name: 'Stone (Adquirente)', type: 'Adquirente', isActive: false },
];

function getHealth(margin: number): MarginHealth {
  if (margin >= 0.35) return 'healthy';
  if (margin >= 0.15) return 'warning';
  return 'danger';
}

function buildTable(overrides: OverrideMap): FeesTable {
  const table = {} as FeesTable;
  for (const brand of PRICING_BRANDS) {
    table[brand] = {};
    for (const inst of TABLE_INSTALLMENTS) {
      const cost = ACQUIRER_COSTS[brand][inst];
      if (cost === undefined) continue; // N/A (e.g., Pix 2x+)

      const overrideRate = overrides[brand]?.[inst];
      const defaultRate  = DEFAULT_CLIENT_RATES[brand][inst] ?? cost;
      const rate         = overrideRate ?? defaultRate;
      const margin       = parseFloat((rate - cost).toFixed(2));

      table[brand][inst] = {
        cost,
        rate,
        margin,
        health: getHealth(margin),
        hasOverride: overrideRate !== undefined,
      };
    }
  }
  return table;
}

function computeSummary(table: FeesTable): FeesSummary {
  const cells: PricingCell[] = [];
  for (const brand of PRICING_BRANDS) {
    for (const inst of TABLE_INSTALLMENTS) {
      const cell = table[brand][inst];
      if (cell) cells.push(cell);
    }
  }

  const avgMargin = parseFloat(
    (cells.reduce((s, c) => s + c.margin, 0) / cells.length).toFixed(2),
  );

  const alerts: FeesAlert[] = [];
  const lowMarginCells = cells.filter((c) => c.health === 'warning');
  const dangerCells    = cells.filter((c) => c.health === 'danger');
  if (dangerCells.length > 0) {
    alerts.push({ type: 'error', message: `${dangerCells.length} taxa${dangerCells.length > 1 ? 's' : ''} abaixo do custo` });
  }
  if (lowMarginCells.length > 0) {
    alerts.push({ type: 'warning', message: `${lowMarginCells.length} margem${lowMarginCells.length > 1 ? 's' : ''} baixa${lowMarginCells.length > 1 ? 's' : ''}` });
  }

  const competitivenessScore = Math.min(100, Math.round(60 + avgMargin * 40));
  const competitiveness =
    competitivenessScore >= 80 ? 'Alta' : competitivenessScore >= 60 ? 'Média' : 'Baixa';

  return {
    avgMargin,
    avgMarginTarget: 0.35,
    competitiveness,
    competitivenessScore,
    estimatedImpactMonthly: Math.round(avgMargin * 1850000 * 0.01),
    alerts,
  };
}

export function buildFeesViewModel(
  profileId: string,
  costCenterId: string,
  overrides: OverrideMap,
): FeesViewModel {
  const profile    = PRICING_PROFILES.find((p) => p.id === profileId) ?? PRICING_PROFILES[0];
  const costCenter = COST_CENTERS.find((c) => c.id === costCenterId) ?? COST_CENTERS[0];
  const table      = buildTable(overrides);
  const summary    = computeSummary(table);
  return { profile, costCenter, table, summary };
}

export function applyOverride(
  overrides: OverrideMap,
  brand: PricingBrand,
  inst: TableInstallment,
  rate: number,
): OverrideMap {
  return {
    ...overrides,
    [brand]: { ...overrides[brand], [inst]: rate },
  };
}

export function resetOverride(
  overrides: OverrideMap,
  brand: PricingBrand,
  inst: TableInstallment,
): OverrideMap {
  const brandOverrides = { ...overrides[brand] };
  delete brandOverrides[inst];
  return { ...overrides, [brand]: brandOverrides };
}

export function applyBulkOverrides(
  overrides: OverrideMap,
  changes: Array<{ brand: PricingBrand; inst: TableInstallment; rate: number }>,
): OverrideMap {
  let next = { ...overrides };
  for (const { brand, inst, rate } of changes) {
    next = applyOverride(next, brand, inst, rate);
  }
  return next;
}

export function fmtRate(v: number): string {
  return v.toFixed(2).replace('.', ',') + '%';
}
