// app/api/marketplace/listings/[id]/cancel/route.ts
/**
 * Cancel a listing – return escrowed points to seller
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData } = body;

  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const listing = await prisma.marketplaceListing.findFirst({
    where: { id: listingId, sellerId: dbUser.id },
  });

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
  }

  const returnAmount = listing.remainingAmount;
  if (returnAmount <= 0) {
    return NextResponse.json({ error: 'Nothing to return' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: dbUser.id },
      data: {
        pointsBalance: { increment: returnAmount },
        whitePearls: { increment: returnAmount },
        pointsInMarketplace: { decrement: returnAmount },
      },
    }),
    prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: 'cancelled', remainingAmount: 0, updatedAt: new Date() },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({
    where: { id: dbUser.id },
    select: { pointsBalance: true, pointsInMarketplace: true },
  });

  return NextResponse.json({
    success: true,
    returned: returnAmount,
    pointsBalance: updatedUser?.pointsBalance,
    pointsInMarketplace: updatedUser?.pointsInMarketplace,
  });
}
