import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { isMdrMatrix } from '@/lib/guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noDb = () => NextResponse.json({ error: 'Database not configured' }, { status: 503 });

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return noDb();
  try {
    const profile = await prisma.costProfile.findUnique({ where: { id: params.id } });
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (err) {
    console.error(`[cost-profiles:id] GET error:`, err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return noDb();
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.mcc !== undefined) data.mcc = String(body.mcc);
    if (body.isDefault !== undefined) {
      data.isDefault = Boolean(body.isDefault);
      if (data.isDefault) {
        await prisma.costProfile.updateMany({ data: { isDefault: false } });
      }
    }
    if (body.mdrMatrix !== undefined) {
      if (!isMdrMatrix(body.mdrMatrix)) return NextResponse.json({ error: 'Invalid mdrMatrix' }, { status: 400 });
      data.mdrMatrix = JSON.stringify(body.mdrMatrix);
    }

    if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const profile = await prisma.costProfile.update({ where: { id: params.id }, data });
    return NextResponse.json(profile);
  } catch (err) {
    console.error(`[cost-profiles:id] PATCH error:`, err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return noDb();
  try {
    await prisma.costProfile.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[cost-profiles:id] DELETE error:`, err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
