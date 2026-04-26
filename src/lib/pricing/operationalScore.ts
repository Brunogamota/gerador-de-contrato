// ─── Types ────────────────────────────────────────────────────────────────────

export interface OperationData {
  company: {
    legalName:     string;
    tradeName:     string;
    cnpj:          string;
    businessModel: string;
    website:       string;
  };
  volume: {
    monthlyTpv:         number; // R$ mensal
    projectedTpv12m:    number; // R$ projetado 12 meses
    monthlyTransactions: number;
    averageTicket:      number;
  };
  mccMix: Array<{ mcc: string; share: number }>; // share em %
  transactionMix: {
    pix:          number; // % do total
    debit:        number;
    prepaid:      number;
    credit1x:     number;
    credit2to6:   number;
    credit7to12:  number;
  };
  brandMix: {
    visa:       number; // %
    mastercard: number;
    elo:        number;
    hiper:      number;
    amex:       number;
  };
  capture: {
    cardPresent:     boolean;
    cardNotPresent:  boolean;
    tef:             boolean;
    tapOnPhone:      boolean;
    threeDs:         boolean;
    sdkIntegration:  boolean;
    whiteLabel:      boolean;
    customAntifraud: boolean;
  };
  anticipation: {
    receivablesAnticipationNeed:    number; // % das receitas
    estimatedMonthlyAnticipation:   number; // R$
    averageAnticipationDays:        number;
    ownFunding:        boolean;
    rebornSettlement:  boolean;
  };
  currentRate?: number;  // taxa atual do cliente (%)
  observations?: string;
}

export type StrategyKey = 'low' | 'medium' | 'high' | 'max';

export interface RiskLevel { label: 'Baixo' | 'Médio' | 'Alto'; score: number }

export interface PricingScore {
  risk:             RiskLevel;
  marginPotential:  RiskLevel;
  competitiveness:  RiskLevel;
}

export interface StrategyRecommendation {
  strategy:    StrategyKey;
  label:       string;
  rationale:   string;
  scores:      PricingScore;
  suggestions: string[];
  confidence:  number; // 0-100
}

// ─── High-risk MCC sets ───────────────────────────────────────────────────────
const HIGH_RISK_MCC = new Set([
  '7995','5816','7801','7802','7993','7994', // gaming/gambling
  '5912','5122',                              // pharmacy/drugs
  '7841','7994',                              // adult
  '6211','6051',                              // crypto/FX
]);
const MEDIUM_RISK_MCC = new Set([
  '5065','5045','5734','5732',               // electronics
  '4722','7011','7032','7033',               // travel/hotel
  '5621','5661','5691',                      // fashion
]);

function mccRiskScore(mccMix: OperationData['mccMix']): number {
  let score = 0;
  for (const { mcc, share } of mccMix) {
    if (HIGH_RISK_MCC.has(mcc))   score += share * 0.4;
    if (MEDIUM_RISK_MCC.has(mcc)) score += share * 0.15;
  }
  return Math.min(score, 40);
}

function levelLabel(score: number): 'Baixo' | 'Médio' | 'Alto' {
  if (score < 35) return 'Baixo';
  if (score < 65) return 'Médio';
  return 'Alto';
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

export function calculatePricingStrategyScore(d: OperationData): StrategyRecommendation {
  const tx = d.transactionMix;
  const ant = d.anticipation;

  // ── Risk (0–100) ──────────────────────────────────────────────────────────
  let riskScore = 0;

  riskScore += mccRiskScore(d.mccMix);

  const cnpPct = d.capture.cardNotPresent ? (tx.credit2to6 + tx.credit7to12) * 0.6 : 0;
  if (cnpPct > 50) riskScore += 15;
  else if (cnpPct > 30) riskScore += 7;

  if (tx.credit7to12 > 50) riskScore += 15;
  else if (tx.credit7to12 > 30) riskScore += 8;

  if (d.volume.averageTicket > 800)      riskScore += 12;
  else if (d.volume.averageTicket > 400) riskScore += 6;

  if (!d.capture.threeDs && d.capture.cardNotPresent) riskScore += 15;
  if (!d.capture.customAntifraud && d.capture.cardNotPresent) riskScore += 10;

  if (ant.receivablesAnticipationNeed > 60) riskScore += 12;
  else if (ant.receivablesAnticipationNeed > 35) riskScore += 6;

  // Crescimento de volume agressivo: TPV12m / 12 muito superior ao TPV mensal declarado
  const impliedMonthly = d.volume.projectedTpv12m / 12;
  if (impliedMonthly > 0 && d.volume.monthlyTpv > 0) {
    const growthRatio = impliedMonthly / d.volume.monthlyTpv;
    if (growthRatio > 3) riskScore += 10;
    else if (growthRatio > 2) riskScore += 5;
  }

  riskScore = Math.min(Math.round(riskScore), 100);

  // ── Margin Potential (0–100) ──────────────────────────────────────────────
  let marginScore = 0;

  const creditTotal = tx.credit1x + tx.credit2to6 + tx.credit7to12;
  if (creditTotal > 70) marginScore += 22;
  else if (creditTotal > 50) marginScore += 14;
  else if (creditTotal > 30) marginScore += 7;

  if (tx.credit7to12 > 35)      marginScore += 25;
  else if (tx.credit7to12 > 20) marginScore += 15;
  else if (tx.credit7to12 > 10) marginScore += 8;

  // Volume mensal (≥ R$5M = full points)
  const tpvM = d.volume.monthlyTpv / 1_000_000;
  if (tpvM >= 5)        marginScore += 20;
  else if (tpvM >= 2)   marginScore += 14;
  else if (tpvM >= 0.5) marginScore += 7;
  else                  marginScore += 2;

  // Ticket médio alto = mais margem por transação
  if (d.volume.averageTicket > 600)      marginScore += 10;
  else if (d.volume.averageTicket > 300) marginScore += 5;

  // Bandeiras premium (Elo/Amex)
  const premiumBrands = (d.brandMix.elo + d.brandMix.amex + d.brandMix.hiper);
  if (premiumBrands > 30) marginScore += 10;
  else if (premiumBrands > 15) marginScore += 5;

  // Antecipação como receita adicional
  if (ant.receivablesAnticipationNeed > 40) marginScore += 10;
  else if (ant.receivablesAnticipationNeed > 20) marginScore += 5;

  if (ant.rebornSettlement) marginScore += 8;

  marginScore = Math.min(Math.round(marginScore), 100);

  // ── Competitiveness Needed (0–100) ────────────────────────────────────────
  let compScore = 0;

  // Volume grande = cliente tem poder de negociação
  if (tpvM >= 10)      compScore += 25;
  else if (tpvM >= 5)  compScore += 18;
  else if (tpvM >= 2)  compScore += 10;
  else if (tpvM >= 0.5) compScore += 5;

  // Taxa atual baixa = alta competitividade necessária
  if (d.currentRate !== undefined && d.currentRate > 0) {
    if (d.currentRate < 2.5)      compScore += 30;
    else if (d.currentRate < 3.5) compScore += 20;
    else if (d.currentRate < 5.0) compScore += 10;
  }

  // Mix concentrado em parcelado = cliente sensível no 1x
  if (tx.credit7to12 > 40) compScore += 15;

  // Cartão presente = mais concorrência (PDV físico)
  if (d.capture.cardPresent && !d.capture.cardNotPresent) compScore += 10;

  // Crescimento projetado alto = cliente estratégico
  if (impliedMonthly > 0 && d.volume.monthlyTpv > 0) {
    if (impliedMonthly / d.volume.monthlyTpv > 2) compScore += 10;
  }

  compScore = Math.min(Math.round(compScore), 100);

  const scores: PricingScore = {
    risk:            { label: levelLabel(riskScore),   score: riskScore },
    marginPotential: { label: levelLabel(marginScore), score: marginScore },
    competitiveness: { label: levelLabel(compScore),   score: compScore },
  };

  console.log('[operationalScore] risk=%d, margin=%d, comp=%d', riskScore, marginScore, compScore);

  // ── Strategy decision tree ────────────────────────────────────────────────
  let strategy: StrategyKey;

  if (riskScore >= 60 || compScore >= 70 || (d.currentRate !== undefined && d.currentRate < 2.5)) {
    // Alto risco ou alta competitividade necessária → entrada conservadora
    strategy = 'low';
  } else if (marginScore >= 65 && tx.credit7to12 >= 25 && riskScore < 50) {
    // Forte parcelado, margem alta e risco controlado → agressivo no parcelado
    strategy = riskScore < 35 && marginScore >= 80 ? 'max' : 'high';
  } else if (marginScore >= 40 && riskScore < 55 && compScore < 60) {
    // Operação saudável com espaço de margem → balanceado
    strategy = 'medium';
  } else {
    // Default conservador
    strategy = 'low';
  }

  // ── Suggestions ──────────────────────────────────────────────────────────
  const suggestions: string[] = [];

  if (d.currentRate !== undefined && d.currentRate > 0) {
    suggestions.push(`Taxa atual do cliente é ~${d.currentRate.toFixed(1)}% — mantenha a proposta abaixo disso no 1x`);
  }
  if (tx.credit7to12 > 30) {
    suggestions.push('Concentre o spread em 7x–12x onde a sensibilidade a preço é menor');
  }
  if (tx.credit1x > 40) {
    suggestions.push('1x representa volume expressivo — mantenha competitivo para não perder conversão');
  }
  if (!d.capture.threeDs && d.capture.cardNotPresent) {
    suggestions.push('Ative 3DS para reduzir chargebacks e melhorar a aprovação em CNP');
  }
  if (ant.receivablesAnticipationNeed > 30) {
    suggestions.push(`Cliente antecipa ~${ant.receivablesAnticipationNeed}% dos recebíveis — considere taxa de antecipação como alavanca de margem`);
  }
  if (d.brandMix.mastercard > 40 && d.brandMix.visa > 40) {
    suggestions.push('Use Mastercard como faixa de margem adicional se o custo permitir');
  }
  if ((d.brandMix.elo + d.brandMix.amex) > 20) {
    suggestions.push('Elo/Amex têm spread maior — não deixe margem na mesa nessas bandeiras');
  }
  if (tpvM >= 5) {
    suggestions.push('Volume estratégico — priorize ganhar a conta; a margem se consolida com crescimento');
  }
  if (d.capture.customAntifraud) {
    suggestions.push('Antifraude customizável habilitado — risco de chargeback controlado');
  }

  // ── Rationale text ────────────────────────────────────────────────────────
  const stratLabels: Record<StrategyKey, string> = {
    low:    'Conservador',
    medium: 'Balanceado',
    high:   'Agressivo',
    max:    'Máxima Margem',
  };

  const creditDesc = creditTotal > 0
    ? `${Math.round(creditTotal)}% em crédito`
    : 'baixo volume de crédito';
  const instDesc = tx.credit7to12 > 0
    ? `, ${Math.round(tx.credit7to12)}% no parcelado 7x–12x`
    : '';
  const tpvDesc = tpvM >= 1
    ? `TPV mensal de R$${tpvM.toFixed(1)}M`
    : `TPV mensal de R$${Math.round(d.volume.monthlyTpv / 1000)}k`;
  const rateDesc = d.currentRate && d.currentRate > 0
    ? ` Taxa atual informada: ${d.currentRate.toFixed(1)}%.`
    : '';

  const rationale = [
    `Cliente com ${tpvDesc}, ${creditDesc}${instDesc}.${rateDesc}`,
    scores.risk.label === 'Alto'
      ? ' Risco operacional elevado recomenda entrada conservadora.'
      : scores.marginPotential.label === 'Alto'
      ? ' Forte potencial de margem, especialmente no parcelado longo.'
      : ' Operação equilibrada.',
    ` Estratégia recomendada: ${stratLabels[strategy]}.`,
  ].join('');

  const confidence = 100 - Math.abs(riskScore - marginScore) / 2;

  return { strategy, label: stratLabels[strategy], rationale, scores, suggestions, confidence: Math.round(confidence) };
}

// ─── Mock data for tests ──────────────────────────────────────────────────────

export const MOCK_OPERATION_HIGH_INSTALLMENT: OperationData = {
  company: { legalName: 'Aquila Ind. Moveleira LTDA', tradeName: 'Aquila Móveis', cnpj: '12.345.678/0001-90', businessModel: 'Fabricante de móveis B2B', website: 'aquilamoveis.com.br' },
  volume: { monthlyTpv: 3_200_000, projectedTpv12m: 45_000_000, monthlyTransactions: 4_800, averageTicket: 667 },
  mccMix: [{ mcc: '5712', share: 85 }, { mcc: '5021', share: 15 }],
  transactionMix: { pix: 8, debit: 5, prepaid: 0, credit1x: 20, credit2to6: 35, credit7to12: 32 },
  brandMix: { visa: 48, mastercard: 38, elo: 9, hiper: 3, amex: 2 },
  capture: { cardPresent: false, cardNotPresent: true, tef: false, tapOnPhone: false, threeDs: true, sdkIntegration: true, whiteLabel: false, customAntifraud: true },
  anticipation: { receivablesAnticipationNeed: 45, estimatedMonthlyAnticipation: 1_440_000, averageAnticipationDays: 15, ownFunding: false, rebornSettlement: true },
  currentRate: 5.8,
};

export const MOCK_OPERATION_RETAIL: OperationData = {
  company: { legalName: 'Supermercados Brasil LTDA', tradeName: 'Supermercados Brasil', cnpj: '98.765.432/0001-10', businessModel: 'Supermercado', website: 'superbrasil.com.br' },
  volume: { monthlyTpv: 12_000_000, projectedTpv12m: 144_000_000, monthlyTransactions: 120_000, averageTicket: 100 },
  mccMix: [{ mcc: '5411', share: 100 }],
  transactionMix: { pix: 30, debit: 35, prepaid: 2, credit1x: 25, credit2to6: 7, credit7to12: 1 },
  brandMix: { visa: 55, mastercard: 35, elo: 8, hiper: 1, amex: 1 },
  capture: { cardPresent: true, cardNotPresent: false, tef: true, tapOnPhone: false, threeDs: false, sdkIntegration: false, whiteLabel: false, customAntifraud: false },
  anticipation: { receivablesAnticipationNeed: 10, estimatedMonthlyAnticipation: 1_200_000, averageAnticipationDays: 5, ownFunding: true, rebornSettlement: false },
  currentRate: 2.2,
};

if (typeof window === 'undefined') {
  // Server-side smoke test — runs only in Node/Edge
  const r1 = calculatePricingStrategyScore(MOCK_OPERATION_HIGH_INSTALLMENT);
  const r2 = calculatePricingStrategyScore(MOCK_OPERATION_RETAIL);
  console.log('[operationalScore test] moveleira →', r1.strategy, r1.label);
  console.log('[operationalScore test] supermercado →', r2.strategy, r2.label);
  if (r1.strategy === r2.strategy) {
    console.warn('[operationalScore test] WARN: both mocks produced same strategy — review scoring weights');
  }
}
