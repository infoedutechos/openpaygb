import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { reconcileWhitePearlsFromPointsBalance, resolveUserFromInitData } from '@/utils/pearls';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData } = body as { initData?: string };
  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const user = await resolveUserFromInitData(initData);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await reconcileWhitePearlsFromPointsBalance(user.id);
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      whitePearls: true,
      bluePearlsPending: true,
      bluePearlsApprovedTotal: true,
      goldishPearls: true,
      points: true,
      pointsBalance: true,
    },
  });
  if (!fresh) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [recentAudits, recentActivities, recentWithdrawals, recentTransfers] = await Promise.all([
    prisma.pearlAudit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.pearlActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.pearlWithdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.pearlTransfer.findMany({
      where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        sender: { select: { telegramId: true, name: true } },
        recipient: { select: { telegramId: true, name: true } },
      },
    }),
  ]);

  const bluePending = Math.floor(fresh.bluePearlsPending);
  const blueApprovedTotal = Math.floor(fresh.bluePearlsApprovedTotal);
  return NextResponse.json({
    balances: {
      white: Math.floor(fresh.whitePearls),
      bluePending,
      blueApprovedTotal,
      blueTotal: bluePending + blueApprovedTotal,
      goldish: Math.floor(fresh.goldishPearls),
      points: Math.floor(Number(fresh.points ?? 0)),
      pointsBalance: Math.floor(Number(fresh.pointsBalance ?? 0)),
    },
    recentAudits,
    recentActivities,
    recentWithdrawals,
    recentTransfers,
  });
}
