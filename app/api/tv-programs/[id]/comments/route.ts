import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export const dynamic = 'force-dynamic';

const MAX_BODY = 2000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing program id' }, { status: 400 });
  try {
    const comments = await prisma.tvProgramComment.findMany({
      where: { programId: id },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: {
        id: true,
        authorName: true,
        body: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('[tv-programs comments GET]', e);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: programId } = await params;
  if (!programId) return NextResponse.json({ error: 'Missing program id' }, { status: 400 });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const initData =
      (typeof body.initData === 'string' ? body.initData : null) ??
      (typeof body.telegramInitData === 'string' ? body.telegramInitData : null);
    const text = typeof body.body === 'string' ? body.body.trim() : '';

    if (!initData) {
      return NextResponse.json({ error: 'Telegram session required to comment' }, { status: 400 });
    }
    if (!text) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: `Comment too long (max ${MAX_BODY} characters)` }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(initData);
    if (!validatedData || !user?.id) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = String(user.id);
    const authorName =
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
      user.username ||
      'Citizen';

    const program = await prisma.tvProgram.findFirst({
      where: { id: programId, isPublished: true },
      select: { id: true },
    });
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const row = await prisma.tvProgramComment.create({
      data: {
        programId,
        telegramId,
        authorName,
        body: text,
      },
      select: { id: true, authorName: true, body: true, createdAt: true },
    });

    return NextResponse.json({
      comment: {
        id: row.id,
        authorName: row.authorName,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('[tv-programs comments POST]', e);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
