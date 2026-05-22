import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { resolveUserFromInitData } from '@/utils/pearls';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const initData = typeof body?.initData === 'string' ? body.initData : '';
  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const user = await resolveUserFromInitData(initData);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const rows = await prisma.pearlActivity.findMany({
    where: { userId: user.id, sourceKey: 'receipt_rush' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      sourceLabel: true,
      amount: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      rejectionReason: true,
    },
  });

  return NextResponse.json({
    submissions: rows.map((r) => ({
      id: r.id,
      sourceLabel: r.sourceLabel,
      amount: Math.floor(Number(r.amount || 0)),
      status: r.status,
      createdAt: r.createdAt,
      approvedAt: r.approvedAt,
      rejectionReason: r.rejectionReason,
    })),
  });
}
