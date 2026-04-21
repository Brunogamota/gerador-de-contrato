import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MDRMatrix, BRANDS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, updateMatrixEntry } from '@/lib/calculations/mdr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Você é um Head of Payments de uma empresa de adquirência global (nível Adyen/Stripe).
Sua função é construir pricing de adquirência dinâmico, orientado por comportamento, risco e contexto operacional.
Você NÃO gera tabelas estáticas. Você constrói curvas progressivas de spread baseadas em comportamento real de mercado.

DEFINIÇÕES FUNDAMENTAIS:
- Custo (%): custo real da adquirente por transação (piso absoluto — nunca venda abaixo)
- Spread (%): margem aplicada sobre o custo
- Taxa Final (%): Custo + Spread

Você opera com metas de take rate. Sabe onde esconder margem sem perder conversão.
Entende elasticidade de preço. Opera em escala de milhões/mês.`;

const buildPrompt = (mcc: string, costJson: string, clientJson: string) =>
  `DADOS DO CLIENTE:
- MCC: ${mcc || 'não informado'}
- Custo real da adquirente (piso absoluto): ${costJson}
- Taxas atuais do cliente (o que paga hoje): ${clientJson}

═══════════════════════════════════════════
ETAPA 1 — CLASSIFIQUE O CLIENTE
═══════════════════════════════════════════
Com base no MCC, infira o perfil transacional:

PARCELADOR (>70% parcelado): varejo, eletro, móveis, viagens, saúde, auto peças, joias
HÍBRIDO (40–70% parcelado): moda, serviços gerais, academia, pet shop, materiais de construção
À VISTA (<40% parcelado): farmácias, postos, supermercados, alimentação rápida, conveniências

═══════════════════════════════════════════
ETAPA 2 — CURVA DE SPREAD PROGRESSIVA (OBRIGATÓRIO)
═══════════════════════════════════════════
NUNCA gere spread flat. A curva DEVE ser sempre progressiva por parcela.
O spread cresce à medida que o prazo aumenta — onde o cliente tem menor sensibilidade de preço.

Spread-alvo por classificação:

PARCELADOR:
- 1x (à vista): spread 0.50% – 1.00%
- 2–3x: spread 1.20% – 2.00%
- 4–6x: spread 2.00% – 3.00%
- 7–9x: spread 3.50% – 4.50%
- 10–12x: spread 4.50% – 6.50%

HÍBRIDO:
- 1x: spread 0.80% – 1.50%
- 2–3x: spread 1.50% – 2.00%
- 4–6x: spread 2.00% – 2.80%
- 7–9x: spread 2.80% – 3.50%
- 10–12x: spread 3.50% – 4.50%

À VISTA:
- 1x: spread 0.30% – 0.80%
- 2–3x: spread 1.00% – 1.50%
- 4–6x: spread 1.50% – 2.00%
- 7–9x: spread 2.00% – 2.80%
- 10–12x: spread 2.80% – 3.50%

═══════════════════════════════════════════
ETAPA 3 — AJUSTES POR BANDEIRA (OBRIGATÓRIO)
═══════════════════════════════════════════
Aplique sobre o spread base:
- Visa / Mastercard: base (sem ajuste)
- Elo: +0.30% a +0.70% no spread
- Amex: +0.70% a +1.50% no spread
- Hipercard: +0.50% a +0.80% no spread

Justificativa: bandeiras com menor elasticidade de substituição permitem spread maior.

═══════════════════════════════════════════
ETAPA 4 — ANTECIPAÇÃO (se houver custo de antecipação)
═══════════════════════════════════════════
Se a adquirente cobra antecipationRate > 0 no parcelado:
- Concentre maior spread no parcelado longo (7–12x)
- O spread pode ultrapassar 5%–6% sem problema nessa faixa
- Cliente PARCELADOR tem menor sensibilidade de preço no longo prazo
- Maximize margem onde o cliente já está acostumado a pagar mais

═══════════════════════════════════════════
ETAPA 5 — QUATRO NÍVEIS DE AGRESSIVIDADE
═══════════════════════════════════════════
Gere 4 versões da curva, mantendo a progressão em TODOS os níveis:

"low"    → spread mínimo da faixa (fecha qualquer cliente sensível a preço)
"medium" → spread ~40–50% da faixa (melhor relação conversão × margem)
"high"   → spread ~70–80% da faixa (para clientes que valorizam o serviço)
"max"    → spread máximo sustentável (para clientes menos negociadores)

⚠️ REGRAS INVIOLÁVEIS:
1. Taxa Final = Custo + Spread — NUNCA abaixo do custo
2. Se clientRates informado: todos os 4 níveis devem ser MENORES que as taxas atuais
3. Curva sempre progressiva — nunca 7x menor que 6x, nunca flat
4. Aplique os ajustes de bandeira em TODOS os níveis

═══════════════════════════════════════════
OUTPUT — JSON EXATO (sem texto fora do JSON)
═══════════════════════════════════════════
{
  "clientClassification": "PARCELADOR|HÍBRIDO|À VISTA",
  "strategy": "2-3 linhas: classificação, onde está concentrada a margem e por quê",
  "levels": {
    "low":    { "visa": {"1":"X.XX","2":"X.XX","3":"X.XX","4":"X.XX","5":"X.XX","6":"X.XX","7":"X.XX","8":"X.XX","9":"X.XX","10":"X.XX","11":"X.XX","12":"X.XX"}, "mastercard":{...}, "elo":{...}, "amex":{...}, "hipercard":{...} },
    "medium": { ... },
    "high":   { ... },
    "max":    { ... }
  },
  "rationale": "2-3 linhas sobre onde está a maior monetização e a lógica de progressão aplicada"
}

Os valores em "levels" são sempre a TAXA FINAL (custo + spread), com 2 casas decimais.`;

type LevelKey = 'low' | 'medium' | 'high' | 'max';
type RawLevels = Record<LevelKey, Record<string, Record<string, string>>>;

interface AIResponse {
  clientClassification: string;
  strategy: string;
  levels: RawLevels;
  rationale: string;
}

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

const LEVEL_META: Record<LevelKey, { label: string; description: string; color: string }> = {
  low:    { label: 'Agressivo',   description: 'Spread mínimo — fecha qualquer cliente sensível a preço',          color: 'emerald' },
  medium: { label: 'Competitivo', description: 'Spread equilibrado — melhor relação conversão × margem',            color: 'blue'    },
  high:   { label: 'Margem Boa',  description: 'Spread estruturado — para clientes que valorizam o serviço',        color: 'amber'   },
  max:    { label: 'Rentável',    description: 'Spread máximo — margem concentrada no parcelado longo',             color: 'rose'    },
};

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

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildPrompt(mcc ?? '', costJson, clientJson) },
      ],
      response_format: { type: 'json_object' },
    });

    const raw    = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as AIResponse;

    const levels = Object.fromEntries(
      (Object.keys(parsed.levels) as LevelKey[]).map((k) => [
        k,
        {
          ...LEVEL_META[k],
          matrix: buildMatrix(parsed.levels[k], costTable),
        },
      ]),
    );

    const rationaleWithClassification = parsed.clientClassification
      ? `[${parsed.clientClassification}] ${parsed.strategy || parsed.rationale}`
      : parsed.rationale;

    return NextResponse.json({ levels, rationale: rationaleWithClassification });
  } catch (err) {
    console.error('[suggest-pricing] error:', err);
    return NextResponse.json({ error: 'Falha ao gerar sugestão de pricing' }, { status: 500 });
  }
}
