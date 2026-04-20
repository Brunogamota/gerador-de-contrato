import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false }, { status: 503 });

  try {
    const body = await req.json() as {
      event_type?: string;
      document?: { token?: string; status?: string };
    };

    const docToken = body?.document?.token;
    const docStatus = body?.document?.status;
    const eventType = body?.event_type;

    console.log(`[webhook/zapsign] event=${eventType} token=${docToken} status=${docStatus}`);

    if (!docToken) return NextResponse.json({ ok: true });

    const statusMap: Record<string, string> = {
      signed:  'signed',
      refused: 'refused',
      pending: 'pending',
    };

    const newStatus = statusMap[docStatus ?? ''];
    if (!newStatus) return NextResponse.json({ ok: true });

    await prisma.contract.updateMany({
      where: { zapSignToken: docToken } as Record<string, unknown>,
      data: {
        zapSignStatus: newStatus,
        ...(newStatus === 'signed' ? { signedAt: new Date(), status: 'signed' } : {}),
      } as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook/zapsign] error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
