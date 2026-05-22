// app/api/shop/products/[id]/route.ts – get single product (approved or owner)

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
  }

  const product = await prisma.shopProduct.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  if (product.status !== 'approved' && product.status !== 'sold') {
    return NextResponse.json({ error: 'Product not available' }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    title: product.title,
    description: product.description,
    priceAlm: Math.floor(product.priceAlm),
    bannerImageUrl: product.bannerImageUrl,
    imageUrls: product.imageUrls,
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    sellerId: product.sellerId,
    sellerName: product.seller.name ?? 'Seller',
  });
}
