import type { OperationData } from './operationalScore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZoneType = 'visible_anchor' | 'transition' | 'hidden_capture' | 'financial' | 'brand_premium';

export interface MarginZone {
  id:               string;
  name:             string;
  type:             ZoneType;
  sensitivityScore: number;  // 0–100: higher = more price-sensitive (harder to capture)
  opportunityScore: number;  // 0–100: higher = more margin opportunity
  rationale:        string;
}

export interface BehavioralAnalysis {
  zones:                   MarginZone[];
  installmentMultipliers:  Record<number, number>;  // per installment 1–12, applied to base strategy spread
  brandPremium:            Record<string, number>;  // additional pp per brand on top of Visa/MC
  anticipationOpportunity: number;                  // 0–100
  summary:                 string;
}

// ─── Base sensitivity curve ───────────────────────────────────────────────────
//
// These multipliers encode the core behavioral insight:
//   "Higher installment count → lower price sensitivity → more margin capture room."
//
// 1x is the anchor the client compares across acquirers.
// 12x: the client's mental model shifts from "taxa MDR" to "valor da parcela" —
// a 0.5pp difference on a R$600 ticket is R$3/month, below the perception threshold.
//
// Range 0.88 (compress) → 1.42 (expand). These REPLACE the uniform CLIENT_SCALE.

const BASE_INST_MULT: Record<number, number> = {
  1:  0.88,
  2:  0.92,
  3:  0.97,
  4:  1.02,
  5:  1.07,
  6:  1.12,
  7:  1.20,
  8:  1.25,
  9:  1.30,
  10: 1.35,
  11: 1.38,
  12: 1.42,
};

// ─── Behavioral signal extractors ────────────────────────────────────────────

// How much to further compress the 1x anchor.
// Negative = compress (protect competitiveness), positive = relax slightly.
function anchorPressureDelta(d: OperationData): number {
  let delta = 0;
  // Known low current rate → client is rate-sensitive, anchor matters more
  if (d.currentRate && d.currentRate < 2.5)      delta -= 0.12;
  else if (d.currentRate && d.currentRate < 3.5) delta -= 0.06;
  // PIX-heavy mix → rate-aware client, comparison pressure is high
  if ((d.transactionMix?.pix ?? 0) > 30) delta -= 0.04;
  // CNP-only (e-commerce): benchmark is approval rate, not raw MDR → slight relief
  if (d.capture?.cardNotPresent && !d.capture?.cardPresent) delta += 0.04;
  return delta;
}

// How much to expand 7–12x spreads due to ticket size opacity.
// At high tickets, 0.5pp extra is absolute cents in the monthly installment — invisible.
function ticketOpacityBoost(d: OperationData): number {
  const avg = d.volume?.averageTicket ?? 0;
  if (avg > 1000) return 0.15;
  if (avg > 600)  return 0.10;
  if (avg > 300)  return 0.05;
  return 0;
}

// How much to expand 7–12x when client mix is already concentrated there.
// Heavy use = revealed preference for installments = lower churn risk from spread.
function installmentConcentrationBoost(d: OperationData): number {
  const pct = d.transactionMix?.credit7to12 ?? 0;
  if (pct > 40) return 0.08;
  if (pct > 25) return 0.05;
  if (pct > 10) return 0.02;
  return 0;
}

// ─── Core function ────────────────────────────────────────────────────────────

export function identifyHiddenMarginZones(d: OperationData): BehavioralAnalysis {
  const tx  = d.transactionMix ?? { pix: 0, debit: 0, prepaid: 0, credit1x: 0, credit2to6: 0, credit7to12: 0 };
  const bm  = d.brandMix       ?? { visa: 50, mastercard: 35, elo: 10, hiper: 3, amex: 2 };
  const ant = d.anticipation   ?? { receivablesAnticipationNeed: 0, estimatedMonthlyAnticipation: 0, averageAnticipationDays: 30, ownFunding: false, rebornSettlement: false };
  const vol = d.volume         ?? { monthlyTpv: 0, projectedTpv12m: 0, monthlyTransactions: 0, averageTicket: 0 };
  const cap = d.capture        ?? { cardPresent: false, cardNotPresent: false, tef: false, tapOnPhone: false, threeDs: false, sdkIntegration: false, whiteLabel: false, customAntifraud: false };

  const apDelta = anchorPressureDelta(d);
  const tob     = ticketOpacityBoost(d);
  const icb     = installmentConcentrationBoost(d);
  const premShare = bm.elo + bm.amex + bm.hiper;

  // ── Per-installment multipliers ───────────────────────────────────────────
  // Adjust the base curve with behavioral signals.
  // 1x receives only the anchor pressure signal.
  // 2–6x receive partial ticket/CNP signals (transition zone).
  // 7–12x receive full behavioral boosts (hidden capture zone).
  const installmentMultipliers: Record<number, number> = {};

  for (let inst = 1; inst <= 12; inst++) {
    const base = BASE_INST_MULT[inst] ?? 1.0;
    let adj = 0;

    if (inst === 1) {
      adj = apDelta;
    } else if (inst <= 3) {
      adj = apDelta * 0.4 + tob * 0.1;
    } else if (inst <= 6) {
      adj = tob * 0.4 + icb * 0.2;
    } else {
      // 7–12: full behavioral capture
      adj = tob + icb;
    }

    installmentMultipliers[inst] = +(Math.max(0.50, base + adj)).toFixed(4);
  }

  console.log('[behavioralModel] installmentMult:', installmentMultipliers);
  console.log('[behavioralModel] signals: anchorDelta=%s, ticketOpacity=%s, instConc=%s', apDelta, tob, icb);

  // ── Brand premiums (pp additions on top of Visa/MC) ───────────────────────
  // Elo/Amex/Hiper: merchants know these carry premium cost — spread is accepted.
  const brandPremium: Record<string, number> = {
    visa:       0,
    mastercard: 0,
    elo:        +(0.40 + (premShare > 30 ? 0.15 : 0)).toFixed(2),
    amex:       +(1.00 + (bm.amex > 10 ? 0.20 : 0)).toFixed(2),
    hipercard:  0.55,
  };

  // ── Zone identification ───────────────────────────────────────────────────

  const zones: MarginZone[] = [];

  // Zone 1 — Visible anchor (1x)
  const anchorSensitivity = Math.min(100, Math.round(
    80
    + (d.currentRate && d.currentRate < 2.5  ? 15 : d.currentRate && d.currentRate < 3.5 ? 8 : 0)
    + (tx.pix > 30 ? 8 : tx.pix > 15 ? 4 : 0)
    + (cap.cardPresent && !cap.cardNotPresent ? 5 : 0)
    - (cap.cardNotPresent && !cap.cardPresent ? 8 : 0),
  ));
  zones.push({
    id:               'anchor_1x',
    name:             'À Vista / 1x',
    type:             'visible_anchor',
    sensitivityScore: anchorSensitivity,
    opportunityScore: Math.max(5, 100 - anchorSensitivity),
    rationale: d.currentRate && d.currentRate > 0
      ? `Taxa atual do cliente: ${d.currentRate.toFixed(1)}% — esse é o ponto de comparação. Manter proposta abaixo para não perder a conta.`
      : 'Taxa mais comparada pelo cliente. Manter competitiva para proteger conversão.',
  });

  // Zone 2 — Transition (2–6x)
  const transOpportunity = Math.min(65, Math.round(35 + tob * 100 * 0.3 + icb * 100 * 0.2));
  zones.push({
    id:               'transition_2_6',
    name:             'Parcelado 2x–6x',
    type:             'transition',
    sensitivityScore: Math.round(100 - transOpportunity),
    opportunityScore: transOpportunity,
    rationale:        'Zona de transição: cliente ainda compara parcialmente, mas aceita spread progressivo. Aquecer margem gradualmente aqui.',
  });

  // Zone 3 — Hidden capture (7–12x)
  const instOpportunity = Math.min(95, Math.round(
    60
    + tob * 100 * 0.5
    + icb * 100 * 0.5
    + (vol.averageTicket > 600 ? 10 : 0),
  ));
  const ticketParcel  = vol.averageTicket > 0 ? vol.averageTicket / 12 : 0;
  const halfPpAbsVal  = vol.averageTicket > 0 ? vol.averageTicket * 0.005 : 0;
  const inst7to12Rationale = [
    ticketParcel > 0
      ? `Ticket R$${Math.round(vol.averageTicket)} → parcela ~R$${ticketParcel.toFixed(0)} no 12x.`
      : '',
    halfPpAbsVal > 0
      ? ` 0,5pp extra = R$${halfPpAbsVal.toFixed(2)} por transação — abaixo da percepção do cliente.`
      : '',
    tx.credit7to12 > 20
      ? ` ${Math.round(tx.credit7to12)}% do mix nessa faixa: cliente já comprometido com parcelamento.`
      : '',
  ].join('').trim() || 'Principal zona de captura: cliente foca no valor da parcela, não na taxa.';

  zones.push({
    id:               'hidden_7_12',
    name:             'Parcelado Longo 7x–12x',
    type:             'hidden_capture',
    sensitivityScore: Math.max(5, 100 - instOpportunity),
    opportunityScore: instOpportunity,
    rationale:        inst7to12Rationale,
  });

  // Zone 4 — Anticipation (financial — different anchor from MDR)
  const antOpportunity = Math.min(90, Math.round(ant.receivablesAnticipationNeed * 1.6));
  if (ant.receivablesAnticipationNeed > 10) {
    zones.push({
      id:               'anticipation',
      name:             'Antecipação de Recebíveis',
      type:             'financial',
      sensitivityScore: 25,  // client frames as "cost of capital", not MDR comparison
      opportunityScore: antOpportunity,
      rationale:        `Cliente antecipa ~${Math.round(ant.receivablesAnticipationNeed)}% dos recebíveis. Framing financeiro (custo de capital) desvincula da comparação MDR.${ant.estimatedMonthlyAnticipation > 0 ? ` Potencial de R$${Math.round(ant.estimatedMonthlyAnticipation / 1000)}k/mês em receita de antecipação.` : ''}`,
    });
  }

  // Zone 5 — Brand premium (Elo / Amex / Hiper)
  if (premShare > 10) {
    const brandNames = [
      bm.elo > 3  ? 'Elo'  : '',
      bm.amex > 2 ? 'Amex' : '',
      bm.hiper > 2 ? 'Hiper' : '',
    ].filter(Boolean).join('/');
    zones.push({
      id:               'premium_brands',
      name:             `Bandeiras Premium (${brandNames || 'Elo/Amex'})`,
      type:             'brand_premium',
      sensitivityScore: 22,  // merchants accept and expect higher rates here
      opportunityScore: Math.min(80, Math.round(premShare * 2.2)),
      rationale:        `${Math.round(premShare)}% do mix em bandeiras premium. Mercado aceita spread maior — capturável sem pressão no 1x Visa/MC.`,
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const topCapture = zones
    .filter((z) => z.type !== 'visible_anchor')
    .sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  const summary = topCapture
    ? `Zona de maior captura: ${topCapture.name} (oportunidade ${topCapture.opportunityScore}/100). ${topCapture.rationale}`
    : 'Análise comportamental concluída.';

  return {
    zones,
    installmentMultipliers,
    brandPremium,
    anticipationOpportunity: antOpportunity,
    summary,
  };
}
