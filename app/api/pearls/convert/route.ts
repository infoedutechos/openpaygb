import { NextResponse } from 'next/server';
import { PearlAuditEventType, PearlType } from '@prisma/client';
import prisma from '@/utils/prisma';
import { WHITE_TO_GOLDISH_RATE, createPearlAudit, resolveUserFromInitData } from '@/utils/pearls';

type ConversionType = 'white_to_goldish';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, conversionType, amount } = body as {
    initData?: string;
    conversionType?: ConversionType;
    amount?: number;
  };
  if (!initData || !conversionType) {
    return NextResponse.json({ error: 'Missing initData or conversionType' }, { status: 400 });
  }

  if (conversionType !== 'white_to_goldish') {
    return NextResponse.json(
      { error: 'Golden pearls cannot be converted to white. Only white → golden is allowed.' },
      { status: 400 }
    );
  }

  const user = await resolveUserFromInitData(initData);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const requestedWhiteAmount = Number.isFinite(Number(amount)) && Number(amount) > 0
      ? Math.floor(Number(amount))
      : Math.floor(user.whitePearls);
  if (requestedWhiteAmount <= 0 || user.whitePearls < requestedWhiteAmount) {
    return NextResponse.json({ error: 'Insufficient white pearls' }, { status: 400 });
  }
  const whiteConsumed = Math.floor(requestedWhiteAmount / WHITE_TO_GOLDISH_RATE) * WHITE_TO_GOLDISH_RATE;
  const goldish = Math.floor(whiteConsumed / WHITE_TO_GOLDISH_RATE);
  if (goldish <= 0) {
    return NextResponse.json(
      { error: `Not enough white pearls. Need ${WHITE_TO_GOLDISH_RATE.toLocaleString()} white for 1 golden pearl.` },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        whitePearls: { decrement: whiteConsumed },
        pointsBalance: { decrement: whiteConsumed },
        goldishPearls: { increment: goldish },
      },
    });
    await tx.pearlConversion.create({
      data: {
        userId: user.id,
        fromType: PearlType.WHITE,
        toType: PearlType.GOLDISH,
        fromAmount: whiteConsumed,
        toAmount: goldish,
        trigger: 'user_request',
      },
    });
    await createPearlAudit(tx, {
      userId: user.id,
      eventType: PearlAuditEventType.CONVERT_WHITE_TO_GOLDISH,
      amount: goldish,
      pearlType: PearlType.GOLDISH,
      meta: { whiteConsumed },
    });
  });

  return NextResponse.json({
    success: true,
    conversion: { from: 'WHITE', to: 'GOLDISH', fromAmount: whiteConsumed, toAmount: goldish },
  });
}
