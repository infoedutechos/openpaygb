// app/api/admin/daily-combo/route.ts

/**
 * Admin API for Daily Combo (Hybrid mode)
 * GET: list cards, combos, templates
 * POST: set override, bulk import templates, add card
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode'); // 'cards' | 'combos' | 'templates'

  if (mode === 'cards') {
    const cards = await prisma.comboCard.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] });
    return NextResponse.json({ cards });
  }

  if (mode === 'templates') {
    const templates = await prisma.dailyComboTemplate.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json({ templates });
  }

  const combos = await prisma.dailyCombo.findMany({
    orderBy: { date: 'desc' },
    take: 60,
  });
  return NextResponse.json({ combos });
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const body = await req.json().catch(() => ({}));
  const { action, date, cardSlugs, templates } = body;

  if (action === 'setCombo') {
    if (!date || !Array.isArray(cardSlugs) || cardSlugs.length !== 3) {
      return NextResponse.json({ error: 'date and cardSlugs (3 items) required' }, { status: 400 });
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const today = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const slugs = cardSlugs.map((s: string) => String(s).trim().toLowerCase()).filter(Boolean);
    if (slugs.length !== 3) {
      return NextResponse.json({ error: 'Exactly 3 card slugs required' }, { status: 400 });
    }

    const combo = await prisma.dailyCombo.upsert({
      where: { date: today },
      create: { date: today, cardSlugs: slugs, isOverride: true },
      update: { cardSlugs: slugs, isOverride: true },
    });
    return NextResponse.json({ success: true, combo });
  }

  if (action === 'bulkImportTemplates') {
    const list = Array.isArray(templates) ? templates : (typeof templates === 'string' ? templates.split(/\n/).map((l: string) => l.trim().split(/[\s,]+/)) : []);
    const valid = list.filter((row: string[]) => Array.isArray(row) && row.length >= 3);
    const triplets = valid.map((row: string[]) => row.slice(0, 3).map((s: string) => String(s).trim().toLowerCase()));

    if (triplets.length === 0) {
      return NextResponse.json({ error: 'No valid template rows (3 slugs per row)' }, { status: 400 });
    }

    const maxOrderRes = await prisma.dailyComboTemplate.aggregate({ _max: { order: true } });
    let nextOrder = (maxOrderRes._max.order ?? -1) + 1;

    const created = await prisma.$transaction(
      triplets.map((slugs: string[]) =>
        prisma.dailyComboTemplate.create({
          data: { cardSlugs: slugs, order: nextOrder++ },
        })
      )
    );
    return NextResponse.json({ success: true, imported: created.length });
  }

  if (action === 'addCard') {
    const { slug, label, image, category } = body;
    if (!slug || !label || !category) {
      return NextResponse.json({ error: 'slug, label, category required' }, { status: 400 });
    }

    const slugClean = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
    const maxOrder = await prisma.comboCard.aggregate({ _max: { order: true } });

    const card = await prisma.comboCard.create({
      data: {
        slug: slugClean,
        label: String(label).trim(),
        image: String(image || slugClean).trim(),
        category: String(category).trim(),
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    return NextResponse.json({ success: true, card });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
