import { NextRequest, NextResponse } from 'next/server';
import { BRANDS, InstallmentNumber } from '@/types/pricing';
import { ACCEPTED_MIME, normalizeMime, callOpenAI } from './openai-client';
import { parseChainOfThought, checkQuality } from './parser';
import { buildMatrix } from './matrix-builder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const lg = (m: string) => { console.log(`[parse-pdf] ${m}`); logs.push(m); };

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: 'OPENAI_API_KEY não configurada. Adicione a variável de ambiente e reinicie o servidor.',
      debug: { logs },
    }, { status: 503 });
  }

  let file: File | null = null;
  try {
    const fd = await req.formData();
    file = fd.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o arquivo enviado.' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

  const rawMime = file.type || 'application/octet-stream';
  const mimeType = normalizeMime(rawMime);
  if (!ACCEPTED_MIME.has(rawMime) && !ACCEPTED_MIME.has(mimeType)) {
    return NextResponse.json({ error: `Tipo não suportado: ${rawMime}.` }, { status: 415 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const base64 = fileBuffer.toString('base64');
  lg(`File: ${file.name}, mime=${mimeType}, ${(file.size / 1024).toFixed(0)}KB`);

  let raw: string;
  try {
    lg('OpenAI: calling...');
    raw = await callOpenAI(base64, mimeType);
    lg(`OpenAI: ✓ ${raw.length} chars`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lg(`OpenAI: failed — ${msg}`);
    return NextResponse.json({
      error: `Falha ao processar com OpenAI: ${msg}`,
      debug: { logs },
    }, { status: 502 });
  }

  let parsed;
  try {
    parsed = parseChainOfThought(raw, logs);
  } catch (err) {
    lg(`Parse error: ${err}`);
    return NextResponse.json({ error: 'Falha ao interpretar resposta da IA.', debug: { logs } }, { status: 500 });
  }

  const quality = checkQuality(parsed);
  lg(`Quality: valid=${quality.valid}, total=${quality.totalFilled}`);

  lg('Building matrix...');
  const { meta, table } = parsed;
  const antRate = meta.anticipation_rate ?? 0;
  const includesAnt = meta.rates_include_anticipation && antRate > 0;
  const matrix = buildMatrix(table, antRate, includesAnt, logs);

  const finalCounts: Record<string, number> = {};
  for (const brand of BRANDS) {
    let c = 0;
    for (let i = 1; i <= 12; i++) {
      if (matrix[brand][i as InstallmentNumber]?.mdrBase) c++;
    }
    finalCounts[brand] = c;
  }
  lg(`Final counts: ${JSON.stringify(finalCounts)}`);

  const fees: { anticipationRate?: string; chargebackFee?: string } = {};
  if (antRate > 0) fees.anticipationRate = antRate.toFixed(2);
  if (meta.chargeback_fee > 0) fees.chargebackFee = meta.chargeback_fee.toFixed(2);

  const missingData: string[] = [];
  for (const brand of BRANDS) {
    const n = finalCounts[brand];
    if (n === 0) missingData.push(brand);
    else if (n < 12) missingData.push(`${brand} (${n}/12)`);
  }

  const confLabel: 'high' | 'medium' | 'low' =
    meta.confidence >= 80 ? 'high' : meta.confidence >= 50 ? 'medium' : 'low';

  lg(`DONE: partial=${!quality.valid}, confidence=${meta.confidence}`);

  return NextResponse.json({
    matrix,
    fees,
    confidence: confLabel,
    confidenceScore: meta.confidence,
    missingData,
    partial: !quality.valid,
    debug: {
      logs,
      provider: 'openai',
      quality: { totalFilled: Object.values(finalCounts).reduce((a, b) => a + b, 0), perBrand: finalCounts },
      rawFull: raw,
      parsedTable: table,
    },
  });
}
