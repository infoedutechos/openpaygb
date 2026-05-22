import { NextResponse } from 'next/server';
import { PearlAuditEventType, PearlType } from '@prisma/client';
import prisma from '@/utils/prisma';
import { createPearlAudit, resolveUserFromInitData } from '@/utils/pearls';

type TransferPearlType = 'white' | 'goldish';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, recipientTelegramId, amount, pearlType, note } = body as {
    initData?: string;
    recipientTelegramId?: string;
    amount?: number;
    pearlType?: TransferPearlType;
    note?: string;
  };

  if (!initData || !recipientTelegramId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  if (pearlType !== 'white' && pearlType !== 'goldish') {
    return NextResponse.json({ error: 'pearlType must be white or goldish' }, { status: 400 });
  }

  const sender = await resolveUserFromInitData(initData);
  if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const recipient = await prisma.user.findUnique({ where: { telegramId: String(recipientTelegramId) } });
  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  if (recipient.id === sender.id) return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 });

  const amt = Math.floor(Number(amount));
  if (pearlType === 'white' && sender.whitePearls < amt) {
    return NextResponse.json({ error: 'Insufficient white pearls' }, { status: 400 });
  }
  if (pearlType === 'goldish' && sender.goldishPearls < amt) {
    return NextResponse.json({ error: 'Insufficient goldish pearls' }, { status: 400 });
  }

  const dbType = pearlType === 'white' ? PearlType.WHITE : PearlType.GOLDISH;
  await prisma.$transaction(async (tx) => {
    if (dbType === PearlType.WHITE) {
      await tx.user.update({
        where: { id: sender.id },
        data: { whitePearls: { decrement: amt }, pointsBalance: { decrement: amt } },
      });
      await tx.user.update({
        where: { id: recipient.id },
        data: { whitePearls: { increment: amt }, pointsBalance: { increment: amt } },
      });
    } else {
      await tx.user.update({ where: { id: sender.id }, data: { goldishPearls: { decrement: amt } } });
      await tx.user.update({ where: { id: recipient.id }, data: { goldishPearls: { increment: amt } } });
    }

    await tx.pearlTransfer.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        amount: amt,
        pearlType: dbType,
        note: note?.slice(0, 300) || null,
      },
    });

    await createPearlAudit(tx, {
      userId: sender.id,
      eventType: dbType === PearlType.WHITE ? PearlAuditEventType.TRANSFER_OUT_WHITE : PearlAuditEventType.TRANSFER_OUT_GOLDISH,
      pearlType: dbType,
      amount: amt,
      meta: { toTelegramId: recipient.telegramId },
    });
    await createPearlAudit(tx, {
      userId: recipient.id,
      eventType: dbType === PearlType.WHITE ? PearlAuditEventType.TRANSFER_IN_WHITE : PearlAuditEventType.TRANSFER_IN_GOLDISH,
      pearlType: dbType,
      amount: amt,
      meta: { fromTelegramId: sender.telegramId },
    });
  });

  return NextResponse.json({ success: true });
}
