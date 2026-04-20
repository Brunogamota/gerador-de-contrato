import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MDRMatrix, BRANDS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, updateMatrixEntry } from '@/lib/calculations/mdr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUGGEST_PROMPT = (mcc: string, costJson: string, clientJson: string) =>
  `Você é um especialista em precificação de meios de pagamento no Brasil (adquirência).
Gere QUATRO níveis de tabela MDR para uma proposta comercial.

MCC do cliente: ${mcc || 'não informado'}

TABELA DE CUSTO (adquirente — piso absoluto, nunca venda abaixo):
${costJson}

TAXAS ATUAIS DO CLIENTE (o que ele paga hoje — todos os níveis devem ser MENORES que isso):
${clientJson}

REGRAS OBRIGATÓRIAS:
1. Taxa final > custo em TODOS os casos (nunca venda no prejuízo).
2. Todos os 4 níveis devem ser MENORES que as taxas atuais do cliente (melhor para o cliente).
3. Se não houver taxa do cliente, use benchmarks de mercado para o MCC.
4. 1x tem taxa menor; 12x tem taxa maior — progressão lógica.

DEFINIÇÃO DOS NÍVEIS (margem = final - custo):
- "low":    margem ~0.3–0.5pp — muito competitivo, pouquíssima margem
- "medium": margem ~0.6–1.0pp — equilibrado, bom para fechar
- "high":   margem ~1.1–1.6pp — margem boa, ainda competitivo
- "max":    margem ~1.7–2.5pp — margem máxima sustentável

Retorne SOMENTE JSON neste formato exato:
{
  "levels": {
    "low":    { "visa": {"1":"X.XX","2":"X.XX",...,"12":"X.XX"}, "mastercard":{...}, "elo":{...}, "amex":{...}, "hipercard":{...} },
    "medium": { ... },
    "high":   { ... },
    "max":    { ... }
  },
  "rationale": "Explicação em 2-3 linhas sobre a estratégia e os níveis gerados."
}`;

type LevelKey = 'low' | 'medium' | 'high' | 'max';
type RawLevels = Record<LevelKey, Record<string, Record<string, string>>>;

function buildMatrix(rawLevel: Record<string, Record<string, string>>, costTable: MDRMatrix): MDRMatrix {
  let matrix = createEmptyMatrix();
  for (const brand of BRANDS as BrandName[]) {
    const brandData = rawLevel[brand];
    if (!brandData) continue;
    const costBrand = costTable[brand];
    for (const inst of INSTALLMENTS as unknown as InstallmentNumber[]) {
      const finalRate = brandData[String(inst)];
      const costEntry = costBrand[inst];
      if (!finalRate || !costEntry?.mdrBase) continue;
      const base = parseFloat(costEntry.mdrBase) || 0;
      const ant  = parseFloat(costEntry.anticipationRate || '0');
      const newBase = Math.max(base, parseFloat(finalRate) - ant);
      matrix = updateMatrixEntry(matrix, brand, inst, 'mdrBase', newBase.toFixed(4));
      matrix = updateMatrixEntry(matrix, brand, inst, 'anticipationRate', ant.toFixed(4));
    }
  }
  return matrix;
}

function serializeMDR(matrix: MDRMatrix): string {
  return JSON.stringify(
    Object.fromEntries(
      BRANDS.map((b) => [
        b,
        Object.fromEntries(
          (INSTALLMENTS as unknown as InstallmentNumber[])
            .filter((i) => matrix[b]?.[i]?.mdrBase)
            .map((i) => [i, matrix[b][i].finalMdr || matrix[b][i].mdrBase]),
        ),
      ]).filter(([, v]) => Object.keys(v as object).length > 0),
    ),
    null, 2,
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 503 });

  try {
    const { costTable, clientRates, mcc } = await req.json() as {
      costTable: MDRMatrix;
      clientRates?: MDRMatrix;
      mcc?: string;
    };

    const costJson   = serializeMDR(costTable);
    const clientJson = clientRates ? serializeMDR(clientRates) : 'Não informado';

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: SUGGEST_PROMPT(mcc ?? '', costJson, clientJson) }],
      response_format: { type: 'json_object' },
    });

    const raw    = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as { levels: RawLevels; rationale: string };

    const LEVEL_META: Record<LevelKey, { label: string; description: string; color: string }> = {
      low:    { label: 'Baixo Spread',   description: 'Muito competitivo — ideal para fechar clientes sensíveis a preço',   color: 'emerald' },
      medium: { label: 'Médio Spread',   description: 'Equilibrado — boa chance de fechar com margem saudável',              color: 'blue'    },
      high:   { label: 'Alto Spread',    description: 'Margem boa — para clientes que valorizam o serviço',                  color: 'amber'   },
      max:    { label: 'Grande Spread',  description: 'Margem máxima — testar com clientes menos negociadores',              color: 'rose'    },
    };

    const levels = Object.fromEntries(
      (Object.keys(parsed.levels) as LevelKey[]).map((k) => [
        k,
        {
          ...LEVEL_META[k],
          matrix: buildMatrix(parsed.levels[k], costTable),
        },
      ]),
    );

    return NextResponse.json({ levels, rationale: parsed.rationale });
  } catch (err) {
    console.error('[suggest-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao gerar sugestão de pricing' }, { status: 500 });
  }
}
