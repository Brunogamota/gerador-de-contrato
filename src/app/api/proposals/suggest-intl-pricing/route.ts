import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type LevelKey = 'max' | 'high' | 'medium' | 'low';

const PRICING_FIELDS = [
  'processingRate','processingFlatFee','pricingModel',
  'year1Commitment','year2Commitment',
  'connectPayoutRate','connectPayoutFlatFee','connectMonthlyFee','connectActivationFee',
  'radarStandardFee','radarRfftFee',
  'intel3dsFee','intelAdaptiveRate','intelCardUpdaterFee','intelNetworkTokenFee',
  'fxFeeRate','disputeLostFee','disputeFee',
];

const PROMPT = (costJson: string) =>
  `Você é especialista sênior em pricing de pagamentos internacionais (Stripe/adquirência global).

CUSTOS DO FORNECEDOR (Stripe — uso interno, nunca mostrado ao cliente):
${costJson}

Gere QUATRO NÍVEIS de proposta para cobrar do cliente, do mais agressivo ao mais rentável.
Cada nível inclui uma tabela de pricing completa + valor de setup OPP Internacional.

DEFINIÇÃO DOS NÍVEIS E MARKUPS:
- "max" → AGRESSIVO: markup de 50–150% sobre taxas percentuais, 30–80% sobre fees fixos.
  Setup: entre $2.000–$5.000. Para clientes price-sensitive ou grandes volumes.
- "high" → COMPETITIVO: markup de 150–300% sobre taxas %, 80–150% sobre fees fixos.
  Setup: entre $5.000–$10.000. Boa margem com preço ainda atrativo.
- "medium" → MARGEM BOA: markup de 300–500% sobre taxas %, 150–250% sobre fees fixos.
  Setup: entre $10.000–$25.000. Excelente margem para clientes de médio porte.
- "low" → RENTÁVEL: markup de 500–700% sobre taxas %, 250–400% sobre fees fixos.
  Setup: entre $25.000–$60.000. Margem máxima — clientes que não pesquisam muito.

REGRAS OBRIGATÓRIAS:
1. Se um campo estiver vazio ("") no custo, retorne "" no mesmo campo em todos os níveis.
2. pricingModel: manter igual ao custo em todos os níveis.
3. Commitment (year1/year2): pode reduzir até 20% do custo como incentivo comercial — NÃO aumentar.
4. fxFeeRate (%): adicionar percentual absoluto, não multiplicar (ex: custo 1.5% → high: 3.5%, low: 6.5%).
5. Arredonde todos os valores para 2 casas decimais.
6. setup é em dólares, apenas o número (ex: "8000.00").
7. Maximize a margem — quanto mais alto o nível, mais agressivo o markup deve ser.

Retorne SOMENTE este JSON (sem texto extra):
{
  "levels": {
    "max":    { "setup": "X.XX", "pricing": { ${PRICING_FIELDS.map((f) => `"${f}": "X.XX"`).join(', ')} } },
    "high":   { "setup": "X.XX", "pricing": { ... } },
    "medium": { "setup": "X.XX", "pricing": { ... } },
    "low":    { "setup": "X.XX", "pricing": { ... } }
  },
  "rationale": "2-3 linhas explicando qual nível recomendar e por quê, destacando a margem esperada."
}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 503 });

  try {
    const { costPricing } = await req.json() as { costPricing: IntlPricing };

    const hasData = !!(costPricing.processingRate && costPricing.processingRate !== '' && costPricing.processingRate !== '0.00');
    if (!hasData) {
      return NextResponse.json({ error: 'Preencha o campo "Processing Rate" nos custos do fornecedor antes de gerar sugestões.' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      temperature: 0.2,
      messages: [{ role: 'user', content: PROMPT(JSON.stringify(costPricing, null, 2)) }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as {
      levels: Record<LevelKey, { setup: string; pricing: IntlPricing }>;
      rationale: string;
    };

    const LEVEL_META: Record<LevelKey, { label: string; description: string; color: string }> = {
      max:    { label: 'Agressivo',   description: 'Markup 50–150% — preço competitivo, boa para grandes volumes',       color: 'rose'    },
      high:   { label: 'Competitivo', description: 'Markup 150–300% — margem saudável com preço ainda atrativo',         color: 'amber'   },
      medium: { label: 'Margem Boa',  description: 'Markup 300–500% — excelente margem para clientes de médio porte',    color: 'blue'    },
      low:    { label: 'Rentável',    description: 'Markup 500–700% — margem máxima para clientes menos price-sensitive', color: 'emerald' },
    };

    const levels = Object.fromEntries(
      (Object.keys(parsed.levels) as LevelKey[]).map((k) => [
        k,
        {
          ...LEVEL_META[k],
          setup: parsed.levels[k].setup ?? '0.00',
          pricing: { ...DEFAULT_INTL_PRICING, ...parsed.levels[k].pricing },
        },
      ]),
    );

    return NextResponse.json({ levels, rationale: parsed.rationale });
  } catch (err) {
    console.error('[suggest-intl-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao gerar sugestão de pricing internacional' }, { status: 500 });
  }
}
