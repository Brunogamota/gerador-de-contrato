import { NextRequest, NextResponse } from 'next/server';
import { IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type LevelKey = 'max' | 'high' | 'medium' | 'low';

// Fields treated as percentage rates → apply multiplicative markup
const RATE_FIELDS: (keyof IntlPricing)[] = [
  'processingRate', 'connectPayoutRate', 'intelAdaptiveRate',
];

// Fields treated as flat fees → apply multiplicative markup
const FEE_FIELDS: (keyof IntlPricing)[] = [
  'processingFlatFee', 'connectPayoutFlatFee', 'connectMonthlyFee', 'connectActivationFee',
  'radarStandardFee', 'radarRfftFee', 'intel3dsFee', 'intelCardUpdaterFee',
  'intelNetworkTokenFee', 'disputeLostFee', 'disputeFee',
];

// Commitment fields: can be REDUCED up to 20% as commercial incentive (never increased)
const COMMITMENT_FIELDS: (keyof IntlPricing)[] = ['year1Commitment', 'year2Commitment'];

// fxFeeRate: absolute percentage added (not multiplied)
// pricingModel: pass-through unchanged

interface LevelConfig {
  rateMultiplier:   number;
  feeMultiplier:    number;
  fxAddition:       number;
  commitmentFactor: number;
  setup:            string;
  label:            string;
  description:      string;
  color:            string;
}

const LEVELS: Record<LevelKey, LevelConfig> = {
  max: {
    rateMultiplier:   2.0,
    feeMultiplier:    1.55,
    fxAddition:       1.50,
    commitmentFactor: 0.85,
    setup:            '3500.00',
    label:            'Agressivo',
    description:      'Markup 50–150% — preço competitivo, ideal para grandes volumes',
    color:            'rose',
  },
  high: {
    rateMultiplier:   3.25,
    feeMultiplier:    2.15,
    fxAddition:       3.00,
    commitmentFactor: 0.90,
    setup:            '7500.00',
    label:            'Competitivo',
    description:      'Markup 150–300% — margem saudável com preço ainda atrativo',
    color:            'amber',
  },
  medium: {
    rateMultiplier:   5.0,
    feeMultiplier:    3.0,
    fxAddition:       5.00,
    commitmentFactor: 0.95,
    setup:            '17500.00',
    label:            'Margem Boa',
    description:      'Markup 300–500% — excelente margem para clientes de médio porte',
    color:            'blue',
  },
  low: {
    rateMultiplier:   7.0,
    feeMultiplier:    4.25,
    fxAddition:       8.00,
    commitmentFactor: 1.00,
    setup:            '42500.00',
    label:            'Rentável',
    description:      'Markup 500–700% — margem máxima para clientes menos price-sensitive',
    color:            'emerald',
  },
};

function applyMarkup(cost: IntlPricing, cfg: LevelConfig): IntlPricing {
  const result = { ...DEFAULT_INTL_PRICING };

  for (const field of Object.keys(DEFAULT_INTL_PRICING) as (keyof IntlPricing)[]) {
    const raw = cost[field];

    if (raw === '' || raw === undefined) {
      result[field] = '';
      continue;
    }

    if (field === 'pricingModel') {
      result[field] = raw;
      continue;
    }

    const val = parseFloat(raw);
    if (isNaN(val) || val === 0) {
      result[field] = '';
      continue;
    }

    if (RATE_FIELDS.includes(field)) {
      result[field] = (val * cfg.rateMultiplier).toFixed(2);
    } else if (FEE_FIELDS.includes(field)) {
      result[field] = (val * cfg.feeMultiplier).toFixed(2);
    } else if (field === 'fxFeeRate') {
      result[field] = (val + cfg.fxAddition).toFixed(2);
    } else if (COMMITMENT_FIELDS.includes(field)) {
      result[field] = (val * cfg.commitmentFactor).toFixed(2);
    } else {
      result[field] = raw;
    }
  }

  return result;
}

const RATIONALE =
  'Nível Competitivo (high) é o ponto de entrada recomendado: margem estruturada de ~3× sobre custos de ' +
  'processamento com setup que cobre onboarding. Para clientes enterprise de alto volume, Agressivo (max) ' +
  'maximiza conversão. Para clientes SMB sem benchmarking de mercado, Rentável (low) extrai margem máxima.';

export async function POST(req: NextRequest) {
  try {
    const { costPricing } = await req.json() as { costPricing: IntlPricing };

    const hasData = !!(
      costPricing.processingRate &&
      costPricing.processingRate !== '' &&
      costPricing.processingRate !== '0.00'
    );
    if (!hasData) {
      return NextResponse.json(
        { error: 'Preencha o campo "Processing Rate" nos custos do fornecedor antes de gerar sugestões.' },
        { status: 400 },
      );
    }

    const levels = Object.fromEntries(
      (Object.keys(LEVELS) as LevelKey[]).map((key) => {
        const cfg = LEVELS[key];
        return [
          key,
          {
            label:       cfg.label,
            description: cfg.description,
            color:       cfg.color,
            setup:       cfg.setup,
            pricing:     applyMarkup(costPricing, cfg),
          },
        ];
      }),
    );

    return NextResponse.json({ levels, rationale: RATIONALE });
  } catch (err) {
    console.error('[suggest-intl-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao gerar sugestão de pricing internacional' }, { status: 500 });
  }
}
