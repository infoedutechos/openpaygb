// app/api/shop/products/route.ts
// GET: list approved products (public) or with ?my=1&initData= for seller's listings
// POST: create product (requires initData)

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

const MIN_IMAGES = 4;
const MAX_IMAGES = 10;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');
  const my = searchParams.get('my') === '1';

  if (my && !initData) {
    return NextResponse.json({ error: 'Missing initData for my listings' }, { status: 400 });
  }

  if (my && initData) {
    const { validatedData, user } = validateTelegramWebAppData(initData);
    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }
    const telegramId = user.id?.toString();
    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }
    const dbUser = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const products = await prisma.shopProduct.findMany({
      where: { sellerId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, name: true } },
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
      sellerName: p.seller.name ?? 'Seller',
    }));
    return NextResponse.json({ products: list });
  }

  // Public: approved only
  const products = await prisma.shopProduct.findMany({
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
    include: {
      seller: { select: { id: true, name: true } },
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
    createdAt: p.createdAt.toISOString(),
    sellerName: p.seller.name ?? 'Seller',
  }));
  return NextResponse.json({ products: list });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const initData = (req.url.includes('?') ? new URL(req.url).searchParams.get('initData') : null) || body.initData;
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

  const dbUser = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { title, description, priceAlm, bannerImageUrl, imageUrls } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }
  const price = Number(priceAlm);
  if (!Number.isFinite(price) || price < 1) {
    return NextResponse.json({ error: 'Valid price in PEARLS is required' }, { status: 400 });
  }
  const urls = Array.isArray(imageUrls) ? imageUrls.filter((u: unknown) => typeof u === 'string') : [];
  if (urls.length < MIN_IMAGES) {
    return NextResponse.json({ error: `At least ${MIN_IMAGES} product images are required` }, { status: 400 });
  }
  if (urls.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed` }, { status: 400 });
  }

  const product = await prisma.shopProduct.create({
    data: {
      sellerId: dbUser.id,
      title: title.trim(),
      description: description.trim(),
      priceAlm: Math.floor(price),
      bannerImageUrl: typeof bannerImageUrl === 'string' && bannerImageUrl ? bannerImageUrl : null,
      imageUrls: urls,
      status: 'pending_review',
    },
  });

  return NextResponse.json({
    id: product.id,
    title: product.title,
    status: product.status,
    message: 'Product submitted for review. It will appear in the shop after approval.',
  });
}
