// app/api/admin/cards/route.ts

/**
 * Admin API for Collection cards
 * GET: list cards, POST: add card, PUT: update card
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const cards = await prisma.card.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] });
  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const body = await req.json().catch(() => ({}));
  const { slug, name, description, image, category, unlockType, unlockPayload, bonusType, bonusValue } = body;

  if (!slug || !name || !category || !unlockType || !bonusType) {
    return NextResponse.json({ error: 'slug, name, category, unlockType, bonusType required' }, { status: 400 });
  }

  const slugClean = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
  const maxOrder = await prisma.card.aggregate({ _max: { order: true } });

  const card = await prisma.card.create({
    data: {
      slug: slugClean,
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      image: String(image || slugClean).trim(),
      category: String(category).trim(),
      unlockType: String(unlockType).trim(),
      unlockPayload: unlockPayload ?? {},
      bonusType: String(bonusType).trim(),
      bonusValue: Number(bonusValue ?? 0),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  return NextResponse.json({ success: true, card });
}
