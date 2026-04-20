import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MDRMatrix, BRANDS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix, updateMatrixEntry } from '@/lib/calculations/mdr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUGGEST_PROMPT = (mcc: string, costJson: string, clientJson: string) =>
  `Você é um especialista sênior em precificação de meios de pagamento no Brasil (adquirência).
Sua missão é MAXIMIZAR A MARGEM da empresa, reduzindo o mínimo necessário em relação ao que o cliente paga hoje.
Gere QUATRO níveis de tabela MDR para uma proposta comercial.

MCC do cliente: ${mcc || 'não informado'}

TABELA DE CUSTO (piso absoluto — nunca venda abaixo disso):
${costJson}

TAXAS ATUAIS DO CLIENTE (o que ele paga hoje — referência para os percentuais de redução):
${clientJson}

REGRAS OBRIGATÓRIAS:
1. Taxa final > custo em TODOS os casos. Piso absoluto = custo + 0.20pp.
2. Todos os 4 níveis devem ser MENORES que as taxas atuais do cliente.
3. Calcule a redução como percentual sobre a taxa do cliente, não sobre o spread.
4. Se a taxa do cliente já estiver próxima do custo (spread < 0.5pp), comprima proporcionalmente as reduções para nunca chegar ao piso.
5. Se não houver taxa do cliente informada, use benchmarks típicos de mercado para o MCC e aplique as mesmas regras.
6. 1x tem taxa menor que 12x — progressão de parcelamento lógica.

DEFINIÇÃO DOS NÍVEIS (redução = (taxaCliente - taxaFinal) / taxaCliente):
- "low"    → COMPETITIVO: reduz 2–5% em relação ao cliente. Objetivo: vencer concorrência preservando margem máxima.
- "medium" → POUCA MARGEM: reduz 6–11%. Bom spread, ainda rentável.
- "high"   → MARGEM MÉDIA: reduz 12–18%. Proposta equilibrada para clientes de médio porte.
- "max"    → AGRESSIVO: reduz 19–25%. Use apenas se necessário. Nunca abaixo de custo + 0.30pp.

IMPORTANTE: prefira números no topo de cada faixa (ex: 2-5% → use ~3-4%, não 5%). Maximize a margem.

Retorne SOMENTE JSON neste formato exato:
{
  "levels": {
    "low":    { "visa": {"1":"X.XX","2":"X.XX",...,"12":"X.XX"}, "mastercard":{...}, "elo":{...}, "amex":{...}, "hipercard":{...} },
    "medium": { ... },
    "high":   { ... },
    "max":    { ... }
  },
  "rationale": "Explicação em 2-3 linhas: qual nível recomendar para esse MCC e por quê, destacando a margem esperada."
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

    // Note: displayed in reverse order (max first) — most aggressive (cheapest) to most conservative (best margin)
    const LEVEL_META: Record<LevelKey, { label: string; description: string; color: string }> = {
      max:    { label: 'Agressivo',    description: 'Redução de 19–25% — preço mais baixo possível, margem mínima sustentável',             color: 'rose'    },
      high:   { label: 'Competitivo',  description: 'Redução de 12–18% — bom custo-benefício, maior chance de fechar',                     color: 'amber'   },
      medium: { label: 'Margem Boa',   description: 'Redução de 6–11% — spread saudável para clientes que negociam pouco',                 color: 'blue'    },
      low:    { label: 'Rentável',     description: 'Redução mínima (2–5%) — margem máxima, para clientes que valorizam o serviço',        color: 'emerald' },
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
