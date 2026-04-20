import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { zapSignCreateDoc, ZapSignSigner } from '@/lib/zapsign';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  if (!process.env.ZAPSIGN_API_TOKEN) {
    return NextResponse.json({ error: 'ZAPSIGN_API_TOKEN not configured' }, { status: 503 });
  }

  try {
    const contract = await prisma.contract.findUnique({ where: { id: params.id } });
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const body = await req.json() as { pdfBase64: string; signers: ZapSignSigner[] };

    if (!body.pdfBase64) return NextResponse.json({ error: 'pdfBase64 required' }, { status: 400 });
    if (!body.signers?.length) return NextResponse.json({ error: 'At least one signer required' }, { status: 400 });

    const docName = `${contract.contractNumber} — ${contract.contratanteNome}`;

    const zapDoc = await zapSignCreateDoc({
      name: docName,
      base64_pdf: body.pdfBase64,
      signers: body.signers,
    });

    const signersJson = JSON.stringify(zapDoc.signers.map((s) => ({
      name: s.name,
      email: s.email,
      link: s.link,
      status: s.status,
      token: s.token,
    })));

    await prisma.contract.update({
      where: { id: params.id },
      data: {
        zapSignToken: zapDoc.token,
        zapSignStatus: 'pending',
        zapSignSigners: signersJson,
        sentForSignatureAt: new Date(),
        status: 'active',
      } as Record<string, unknown>,
    });

    console.log(`[send-signature] Contract ${params.id} sent to ZapSign doc=${zapDoc.token}`);

    return NextResponse.json({
      docToken: zapDoc.token,
      signers: zapDoc.signers.map((s) => ({ name: s.name, email: s.email, link: s.link, status: s.status })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-signature] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
