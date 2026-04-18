import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, BrandName } from '@/types/pricing';
import { createEmptyMatrix, mergePartialMatrix } from '@/lib/calculations/mdr';
import { MDREntry } from '@/types/pricing';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function normalizeMime(m: string): string {
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

const PARSE_PROMPT = `You are extracting an MDR rate table from a Brazilian payment proposal image.

TASK: Read the table carefully. Output ONLY the JSON block below, wrapped between ===JSON_START=== and ===JSON_END===. Nothing else.

===JSON_START===
{
  "anticipationRate": "0.00",
  "ratesIncludeAnticipation": false,
  "combinedAmexHipercard": false,
  "table": {
    "visa":       {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "mastercard": {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "elo":        {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "amex":       {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""},
    "hipercard":  {"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":"","9":"","10":"","11":"","12":""}
  },
  "chargebackFee": "0.00",
  "confidence": "high",
  "missingData": []
}
===JSON_END===

INSTRUCTIONS — fill in the JSON above:

1. anticipationRate: Look for text like "Acréscimo de X,XX%" or "Taxa de antecipação X%". Extract X as "X.XX". If absent: "0.00".

2. ratesIncludeAnticipation: true ONLY if the header or title explicitly says rates already include anticipation (e.g. "Antecipação D+2 · Acréscimo de 1,78%" right above the table means the rates include that anticipation). Otherwise false.

3. combinedAmexHipercard: true if the document has a single column for both Amex and Hipercard (e.g. column header "Amex/Hiper/Outras" or "Amex/Hiper"). If true, copy those column values into BOTH "amex" and "hipercard" keys.

4. table: Fill every cell for rows 1 through 12. Rules:
   - Replace "" with the percentage value as a decimal string using a dot: "3.95" NOT "3,95"
   - Read the table row by row: first row 1x, then 2x, then 3x, ... up to 12x
   - For each row, read each brand column left to right
   - If a brand column is absent from the document, leave all cells as ""
   - DO NOT leave cells blank if the brand appears in the document

5. chargebackFee: if visible (e.g. "R$ 65,00 por chargeback"), output "65.00". Otherwise "0.00".

6. confidence: "high" if all values clearly readable, "medium" if some uncertain, "low" if mostly guessing.

7. missingData: list any brand or row you genuinely could not find/read.

CRITICAL: You must read ALL 12 rows for each brand that appears in the document. Do not stop after row 1.`;

type RawTable = {
  [brand: string]: { [inst: string]: string };
};

type RawParsed = {
  anticipationRate: string;
  ratesIncludeAnticipation: boolean;
  combinedAmexHipercard: boolean;
  table: RawTable;
  chargebackFee?: string;
  confidence: 'high' | 'medium' | 'low';
  missingData: string[];
};

function extractJson(raw: string): RawParsed {
  // 1. Try to extract between our explicit markers
  const markerMatch = raw.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
  let jsonStr = markerMatch ? markerMatch[1].trim() : '';

  // 2. Fallback: strip markdown fences and use balanced-brace extraction
  if (!jsonStr) {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    if (start === -1) throw new Error('No JSON found');

    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) throw new Error('Unclosed JSON');
    jsonStr = cleaned.slice(start, end + 1);
  }

  const parsed = JSON.parse(jsonStr);
  if (!parsed.table || typeof parsed.table !== 'object') throw new Error('Missing table');
  return parsed as RawParsed;
}

function safeNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  // Flash is more reliable for vision + structured output than Pro with responseMimeType
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.05,
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    { text: PARSE_PROMPT },
  ]);

  return result.response.text();
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function callOpenAI(base64: string, mimeType: string, isPdf: boolean): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  if (isPdf) throw new Error('PDF_UNSUPPORTED');

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    temperature: 0.05,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: PARSE_PROMPT },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}

// ── Anthropic ────────────────────────────────────────────────────────────────
async function callAnthropic(base64: string, mimeType: string, isPdf: boolean): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  type Block =
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
    | { type: 'text'; text: string };

  const fileBlock: Block = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } };

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    ...(isPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: PARSE_PROMPT }] }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ANTHROPIC_${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.content?.[0]?.text ?? '';
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o arquivo enviado.' }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

  const rawMime = file.type || 'application/octet-stream';
  const mimeType = normalizeMime(rawMime);

  if (!ACCEPTED_MIME.has(rawMime) && !ACCEPTED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo não suportado: ${rawMime}. Use PDF, PNG, JPG ou WebP.` },
      { status: 415 }
    );
  }

  const isPdf = mimeType === 'application/pdf';
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');

  const providers = [
    { name: 'Gemini',    fn: () => callGemini(base64, mimeType) },
    { name: 'OpenAI',    fn: () => callOpenAI(base64, mimeType, isPdf) },
    { name: 'Anthropic', fn: () => callAnthropic(base64, mimeType, isPdf) },
  ];

  let lastError = '';
  let rawText = '';

  for (const provider of providers) {
    try {
      rawText = await provider.fn();
      console.log(`[parse-pdf] ${provider.name} OK — ${rawText.length} chars`);
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_KEY' || msg === 'PDF_UNSUPPORTED') continue;
      console.warn(`[parse-pdf] ${provider.name} failed:`, msg);
      lastError = msg;
    }
  }

  if (!rawText) {
    const hint = lastError.includes('401')
      ? 'Verifique as chaves de API no Vercel.'
      : lastError.includes('429')
      ? 'Limite de requisições atingido. Aguarde e tente novamente.'
      : 'Configure GEMINI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY.';
    return NextResponse.json({ error: `Nenhum provider disponível. ${hint}` }, { status: 503 });
  }

  let parsed: RawParsed;
  try {
    parsed = extractJson(rawText);
  } catch (e) {
    console.error('[parse-pdf] Parse failed. Raw response:', rawText.slice(0, 2000));
    console.error('[parse-pdf] Error:', e);
    return NextResponse.json(
      { error: 'A IA retornou um formato inesperado. Tente novamente ou use uma imagem mais nítida.' },
      { status: 422 }
    );
  }

  // ── Server-side: copy amex → hipercard if document had combined column ────
  if (parsed.combinedAmexHipercard && parsed.table.amex) {
    parsed.table.hipercard = { ...parsed.table.amex };
    console.log('[parse-pdf] Copied amex → hipercard (combined column detected)');
  }

  // ── Also: if hipercard is all empty but amex has data, auto-copy ──────────
  // (fallback for when AI correctly identifies combined column but forgets the flag)
  const hipercardHasData = Object.values(parsed.table.hipercard ?? {}).some(v => v !== '');
  const amexHasData = Object.values(parsed.table.amex ?? {}).some(v => v !== '');
  if (!hipercardHasData && amexHasData) {
    parsed.table.hipercard = { ...parsed.table.amex };
    console.log('[parse-pdf] Auto-copied amex → hipercard (hipercard was empty)');
  }

  // ── Build MDR matrix ──────────────────────────────────────────────────────
  const antRate = safeNum(parsed.anticipationRate);
  const includesAnt = parsed.ratesIncludeAnticipation === true && antRate > 0;

  let matrix = createEmptyMatrix();

  for (const brand of BRANDS) {
    const brandData = parsed.table[brand];
    if (!brandData) continue;

    const partial: Partial<Record<number, MDREntry>> = {};
    let hasAnyValue = false;

    for (let inst = 1; inst <= 12; inst++) {
      const raw = brandData[String(inst)];
      const displayed = safeNum(raw);
      if (displayed === 0) continue;

      hasAnyValue = true;

      let mdrBase: number;
      let entryAntRate: number;

      if (includesAnt) {
        // CET já antecipado: subtrair taxa para obter base
        mdrBase = Math.max(0, Math.round((displayed - antRate) * 10000) / 10000);
        entryAntRate = antRate;
      } else {
        mdrBase = displayed;
        entryAntRate = 0;
      }

      partial[inst] = {
        mdrBase: mdrBase.toFixed(4),
        anticipationRate: entryAntRate.toFixed(4),
        finalMdr: (mdrBase + entryAntRate).toFixed(4),
        isManualOverride: false,
      };
    }

    if (hasAnyValue) {
      matrix = mergePartialMatrix(matrix, brand as BrandName, partial);
    }
  }

  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  const cbFee = safeNum(parsed.chargebackFee);
  if (cbFee > 0) fees.chargebackFee = cbFee.toFixed(2);

  return NextResponse.json({
    matrix,
    fees,
    confidence: parsed.confidence ?? 'low',
    missingData: parsed.missingData ?? [],
  });
}
