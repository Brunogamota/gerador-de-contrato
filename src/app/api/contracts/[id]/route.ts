import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const noDb = () => NextResponse.json({ error: 'Database not configured' }, { status: 503 });

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!prisma) return noDb();
  try {
    const contract = await prisma.contract.findUnique({ where: { id: params.id } });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(contract);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!prisma) return noDb();
  try {
    const body = await req.json();
    const contract = await prisma.contract.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json(contract);
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!prisma) return noDb();
  try {
    await prisma.contract.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
