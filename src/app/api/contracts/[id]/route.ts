import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { sanitizePatch } from '@/lib/guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noDb = () => NextResponse.json({ error: 'Database not configured' }, { status: 503 });

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return noDb();
  try {
    const contract = await prisma.contract.findUnique({ where: { id: params.id } });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.log(`[contracts:id] GET id=${params.id} ok`);
    return NextResponse.json(contract);
  } catch (err) {
    console.error(`[contracts:id] GET id=${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return noDb();
  try {
    const raw = await req.json();
    const safe = sanitizePatch(raw);
    const changed = Object.keys(safe);
    if (!changed.length) {
      return NextResponse.json({ error: 'No updatable fields in body' }, { status: 400 });
    }
    console.log(`[contracts:id] PATCH id=${params.id} fields=${changed.join(',')}`);
    const contract = await prisma.contract.update({ where: { id: params.id }, data: safe });
    return NextResponse.json(contract);
  } catch (err) {
    console.error(`[contracts:id] PATCH id=${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return noDb();
  try {
    console.log(`[contracts:id] DELETE id=${params.id}`);
    await prisma.contract.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[contracts:id] DELETE id=${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
