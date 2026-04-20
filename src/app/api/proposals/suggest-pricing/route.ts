import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MDRMatrix, BRANDS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, updateMatrixEntry } from '@/lib/calculations/mdr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUGGEST_PROMPT = (
  mcc: string,
  costJson: string,
  clientJson: string,
) => `Você é um especialista em precificação de meios de pagamento no Brasil (adquirência).
Sua tarefa é sugerir uma tabela MDR final competitiva e lucrativa para uma proposta comercial.

MCC do cliente: ${mcc || 'não informado'}

TABELA DE CUSTO (adquirente — use como piso, nunca venda abaixo disso):
${costJson}

TAXAS ATUAIS DO CLIENTE (concorrente — tente ser melhor onde fizer sentido):
${clientJson}

REGRAS:
1. Taxa final deve ser SEMPRE maior que o custo correspondente.
2. Seja competitivo em relação às taxas atuais do cliente, mas mantenha margem saudável (mínimo 0.5pp).
3. Para 1x, a taxa costuma ser menor. Para 12x, a taxa costuma ser maior.
4. Se não houver taxas do cliente, use benchmarks de mercado para o MCC informado.
5. Retorne SOMENTE o JSON, sem explicação fora do objeto.

Retorne um objeto JSON no seguinte formato (apenas as bandeiras com custo preenchido):
{
  "suggestion": {
    "visa":       { "1": "X.XX", "2": "X.XX", ..., "12": "X.XX" },
    "mastercard": { "1": "X.XX", ... },
    "elo":        { "1": "X.XX", ... },
    "amex":       { "1": "X.XX", ... },
    "hipercard":  { "1": "X.XX", ... }
  },
  "rationale": "Explicação em 2-3 linhas sobre a estratégia de precificação adotada."
}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 503 });

  try {
    const { costTable, clientRates, mcc } = await req.json() as {
      costTable: MDRMatrix;
      clientRates?: MDRMatrix;
      mcc?: string;
    };

    const costJson = JSON.stringify(
      Object.fromEntries(
        BRANDS.map((b) => [
          b,
          Object.fromEntries(
            INSTALLMENTS.filter((i) => costTable[b]?.[i as InstallmentNumber]?.mdrBase)
              .map((i) => [i, costTable[b][i as InstallmentNumber].finalMdr || costTable[b][i as InstallmentNumber].mdrBase]),
          ),
        ]).filter(([, v]) => Object.keys(v as object).length > 0),
      ),
      null, 2,
    );

    const clientJson = clientRates
      ? JSON.stringify(
          Object.fromEntries(
            BRANDS.map((b) => [
              b,
              Object.fromEntries(
                INSTALLMENTS
                  .filter((i) => clientRates[b]?.[i as InstallmentNumber]?.finalMdr || clientRates[b]?.[i as InstallmentNumber]?.mdrBase)
                  .map((i) => [i, clientRates[b][i as InstallmentNumber].finalMdr || clientRates[b][i as InstallmentNumber].mdrBase]),
              ),
            ]).filter(([, v]) => Object.keys(v as object).length > 0),
          ),
          null, 2,
        )
      : 'Não informado';

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: SUGGEST_PROMPT(mcc ?? '', costJson, clientJson),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as {
      suggestion: Record<string, Record<string, string>>;
      rationale: string;
    };

    // Build MDRMatrix from suggestion
    let matrix = createEmptyMatrix();
    for (const brand of BRANDS as BrandName[]) {
      const brandSuggestion = parsed.suggestion[brand];
      if (!brandSuggestion) continue;
      const costBrand = costTable[brand];
      for (const inst of INSTALLMENTS as unknown as InstallmentNumber[]) {
        const finalRate = brandSuggestion[String(inst)];
        const costEntry = costBrand[inst];
        if (!finalRate || !costEntry?.mdrBase) continue;

        const base = parseFloat(costEntry.mdrBase) || 0;
        const ant = parseFloat(costEntry.anticipationRate || '0');
        const finalVal = parseFloat(finalRate);
        const newBase = Math.max(base, finalVal - ant);

        matrix = updateMatrixEntry(matrix, brand, inst, 'mdrBase', newBase.toFixed(4));
        matrix = updateMatrixEntry(matrix, brand, inst, 'anticipationRate', ant.toFixed(4));
      }
    }

    return NextResponse.json({ matrix, rationale: parsed.rationale });
  } catch (err) {
    console.error('[suggest-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao gerar sugestão de pricing' }, { status: 500 });
  }
}
