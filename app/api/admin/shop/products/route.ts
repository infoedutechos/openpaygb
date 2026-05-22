// app/api/admin/shop/products/route.ts – list all, approve/reject

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) {
    return NextResponse.json(authError.body, { status: authError.status });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';

  const where = status ? { status } : {};
  const products = await prisma.shopProduct.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      seller: { select: { id: true, name: true, telegramId: true } },
    },
  });

  const list = products.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    priceAlm: Math.floor(p.priceAlm),
    bannerImageUrl: p.bannerImageUrl,
    imageUrls: p.imageUrls,
    status: p.status,
    rejectedReason: p.rejectedReason,
    createdAt: p.createdAt.toISOString(),
    sellerId: p.sellerId,
    sellerName: p.seller.name ?? 'Seller',
    sellerTelegramId: p.seller.telegramId,
  }));

  return NextResponse.json({ products: list });
}

export async function PATCH(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) {
    return NextResponse.json(authError.body, { status: authError.status });
  }

  const body = await req.json().catch(() => ({}));
  const { productId, action, rejectedReason } = body; // action: 'approve' | 'reject'

  if (!productId || typeof productId !== 'string') {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 });
  }

  const product = await prisma.shopProduct.findUnique({
    where: { id: productId },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  if (product.status !== 'pending_review') {
    return NextResponse.json({ error: 'Product is not pending review' }, { status: 400 });
  }

  if (action === 'approve') {
    await prisma.shopProduct.update({
      where: { id: productId },
      data: { status: 'approved', rejectedReason: null },
    });
    return NextResponse.json({ message: 'Product approved. It is now visible in the shop.' });
  }

  await prisma.shopProduct.update({
    where: { id: productId },
    data: { status: 'rejected', rejectedReason: typeof rejectedReason === 'string' ? rejectedReason : null },
  });
  return NextResponse.json({ message: 'Product rejected.' });
}
