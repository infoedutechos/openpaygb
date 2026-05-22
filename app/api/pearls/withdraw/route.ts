import { NextResponse } from 'next/server';
import { PearlAuditEventType, PearlWithdrawalStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { createPearlAudit, resolveUserFromInitData } from '@/utils/pearls';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, goldishAmount, cashAmount } = body as {
    initData?: string;
    goldishAmount?: number;
    cashAmount?: number;
  };
  if (!initData || !Number.isFinite(Number(goldishAmount)) || Number(goldishAmount) <= 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const user = await resolveUserFromInitData(initData);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const amount = Math.floor(Number(goldishAmount));
  if (user.goldishPearls < amount) {
    return NextResponse.json({ error: 'Insufficient goldish pearls' }, { status: 400 });
  }

  const withdrawal = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { goldishPearls: { decrement: amount } },
    });
    const created = await tx.pearlWithdrawal.create({
      data: {
        userId: user.id,
        goldishAmount: amount,
        cashAmount: Number.isFinite(Number(cashAmount)) ? Number(cashAmount) : null,
        status: PearlWithdrawalStatus.PENDING,
      },
    });
    await createPearlAudit(tx, {
      userId: user.id,
      eventType: PearlAuditEventType.WITHDRAW_REQUEST,
      amount,
      meta: { withdrawalId: created.id, cashAmount: created.cashAmount },
    });
    return created;
  });

  return NextResponse.json({ success: true, withdrawal });
}
