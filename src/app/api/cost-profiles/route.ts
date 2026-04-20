import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { isMdrMatrix } from '@/lib/guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const profiles = await prisma.costProfile.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(profiles);
  } catch (err) {
    console.error('[cost-profiles] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const { name, mcc, mdrMatrix, isDefault, intlCostPricing } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!isMdrMatrix(mdrMatrix)) return NextResponse.json({ error: 'Invalid mdrMatrix' }, { status: 400 });

    if (isDefault) {
      await prisma.costProfile.updateMany({ data: { isDefault: false } });
    }

    const profile = await prisma.costProfile.create({
      data: {
        name: name.trim(),
        mcc: mcc ?? '',
        mdrMatrix: JSON.stringify(mdrMatrix),
        intlCostPricing: JSON.stringify(intlCostPricing ?? {}),
        isDefault: isDefault ?? false,
      },
    });
    console.log(`[cost-profiles] POST created id=${profile.id} name="${profile.name}" mcc=${profile.mcc}`);
    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cost-profiles] POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
