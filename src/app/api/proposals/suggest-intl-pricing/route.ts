import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const PROMPT = (costJson: string) =>
  `Você é especialista em pricing de pagamentos internacionais via Stripe.

Aqui estão os CUSTOS que a Stripe nos cobra (uso interno — nunca mostrado ao cliente):
${costJson}

Sua missão: gerar uma SUGESTÃO DE PROPOSTA para cobrar do cliente com markup razoável e rentável.

REGRAS DE MARKUP:
1. processingRate (%): adicionar 25–35% sobre o custo (ex: custo 2.89% → proposta 3.70–3.90%)
2. processingFlatFee ($): adicionar 15–20% (ex: custo $1.00 → proposta $1.20)
3. connectPayoutRate (%): markup de 20–30%
4. connectPayoutFlatFee ($): markup de 15–20%
5. connectMonthlyFee ($): markup de 10–15% (já é receita recorrente)
6. connectActivationFee ($): markup de 10–20%
7. radarStandardFee / radarRfftFee ($): repassar sem ou com markup mínimo (5–10%) — é custo de segurança
8. intel3dsFee / intelCardUpdaterFee / intelNetworkTokenFee ($): markup de 10–15%
9. intelAdaptiveRate (%): markup de 10–20%
10. fxFeeRate (%): adicionar 0.5–1.0pp absoluto (ex: 2.0% → 2.75%)
11. disputeLostFee / disputeFee ($): markup de 20–30%
12. year1Commitment / year2Commitment: manter ou reduzir levemente (benefício para o cliente)
13. pricingModel: manter igual

IMPORTANTE:
- Arredonde todos os valores para 2 casas decimais
- Se um campo estiver vazio ou zerado no custo, retorne vazio ("") no mesmo campo
- Maximize a margem sem perder competitividade

Retorne SOMENTE este JSON:
{
  "pricing": {
    "processingRate": "X.XX",
    "processingFlatFee": "X.XX",
    "pricingModel": "...",
    "year1Commitment": "X.XX",
    "year2Commitment": "X.XX",
    "connectPayoutRate": "X.XX",
    "connectPayoutFlatFee": "X.XX",
    "connectMonthlyFee": "X.XX",
    "connectActivationFee": "X.XX",
    "radarStandardFee": "X.XX",
    "radarRfftFee": "X.XX",
    "intel3dsFee": "X.XX",
    "intelAdaptiveRate": "X.XX",
    "intelCardUpdaterFee": "X.XX",
    "intelNetworkTokenFee": "X.XX",
    "fxFeeRate": "X.XX",
    "disputeLostFee": "X.XX",
    "disputeFee": "X.XX"
  },
  "rationale": "Explicação em 1-2 linhas da estratégia de markup aplicada."
}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 503 });

  try {
    const { costPricing } = await req.json() as { costPricing: IntlPricing };

    const hasData = Object.values(costPricing).some((v) => v && v !== '' && v !== '0.00');
    if (!hasData) {
      return NextResponse.json({ error: 'Preencha primeiro os custos do fornecedor internacional na aba Custo.' }, { status: 400 });
    }

    const costJson = JSON.stringify(costPricing, null, 2);

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      temperature: 0.2,
      messages: [{ role: 'user', content: PROMPT(costJson) }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as { pricing: IntlPricing; rationale: string };

    const pricing: IntlPricing = { ...DEFAULT_INTL_PRICING, ...parsed.pricing };

    return NextResponse.json({ pricing, rationale: parsed.rationale });
  } catch (err) {
    console.error('[suggest-intl-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao gerar sugestão de pricing internacional' }, { status: 500 });
  }
}
