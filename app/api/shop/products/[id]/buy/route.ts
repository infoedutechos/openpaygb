// app/api/shop/products/[id]/buy/route.ts – buy product with PEARLS

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json().catch(() => ({}));
  const url = req.url;
  const initData = (url.includes('?') ? new URL(url).searchParams.get('initData') : null) || body.initData;
  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }
  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }
  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  const { id: productId } = await params;
  if (!productId) {
    return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
  }

  const buyer = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, pointsBalance: true },
  });
  if (!buyer) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const product = await prisma.shopProduct.findUnique({
    where: { id: productId },
    include: { seller: { select: { id: true, pointsBalance: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  if (product.status !== 'approved') {
    return NextResponse.json({ error: 'Product is not available for purchase' }, { status: 400 });
  }
  if (product.sellerId === buyer.id) {
    return NextResponse.json({ error: 'You cannot buy your own product' }, { status: 400 });
  }

  const priceAlm = Math.floor(product.priceAlm);
  const balance = buyer.pointsBalance ?? 0;
  if (balance < priceAlm) {
    return NextResponse.json(
      { error: 'Insufficient PEARLS balance', required: priceAlm, balance: Math.floor(balance) },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: buyer.id },
      data: { pointsBalance: { decrement: priceAlm }, whitePearls: { decrement: priceAlm } },
    }),
    prisma.user.update({
      where: { id: product.sellerId },
      data: { pointsBalance: { increment: priceAlm }, whitePearls: { increment: priceAlm } },
    }),
    prisma.shopProduct.update({
      where: { id: productId },
      data: { status: 'sold' },
    }),
    prisma.shopPurchase.create({
      data: {
        productId,
        buyerId: buyer.id,
        amountAlm: priceAlm,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: 'Purchase complete. PEARLS has been transferred to the seller.',
    newBalance: Math.floor(balance - priceAlm),
  });
}
