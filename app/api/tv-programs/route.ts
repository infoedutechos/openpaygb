import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { youtubeEmbedUrlFromInput } from '@/utils/youtube-embed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeProgram(p: {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  scheduledAt: Date | null;
  sortOrder: number;
  createdAt: Date;
}) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    youtubeUrl: p.youtubeUrl,
    embedUrl: youtubeEmbedUrlFromInput(p.youtubeUrl),
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rows = await prisma.tvProgram.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { scheduledAt: 'desc' }],
    });

    const now = Date.now();
    const upcoming = rows
      .filter((r) => {
        if (!r.scheduledAt) return false;
        return new Date(r.scheduledAt).getTime() >= now;
      })
      .sort((a, b) => {
        const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return ta - tb;
      })
      .map(serializeProgram);

    const past = rows
      .filter((r) => !r.scheduledAt || new Date(r.scheduledAt).getTime() < now)
      .sort((a, b) => {
        const ta = new Date(a.scheduledAt ?? a.createdAt).getTime();
        const tb = new Date(b.scheduledAt ?? b.createdAt).getTime();
        return tb - ta;
      })
      .map(serializeProgram);

    return NextResponse.json({ upcoming, past });
  } catch (e) {
    console.error('[tv-programs GET]', e);
    return NextResponse.json({ error: 'Failed to load programs' }, { status: 500 });
  }
}
