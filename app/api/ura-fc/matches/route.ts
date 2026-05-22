import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeMatch(m: {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  kickoffAt: Date;
  venue: string | null;
  competition: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  highlightUrl: string | null;
  sortOrder: number;
}) {
  return {
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeLogoUrl: m.homeLogoUrl,
    awayLogoUrl: m.awayLogoUrl,
    kickoffAt: m.kickoffAt.toISOString(),
    venue: m.venue,
    competition: m.competition,
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    highlightUrl: m.highlightUrl,
    sortOrder: m.sortOrder,
  };
}

export async function GET() {
  try {
    const rows = await prisma.uraFcMatch.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { kickoffAt: 'asc' }],
    });

    const upcoming = rows
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
      .map(serializeMatch);

    const results = rows
      .filter((r) => r.status === 'completed' || r.status === 'cancelled')
      .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
      .map(serializeMatch);

    return NextResponse.json({
      upcoming,
      results,
      officialSiteUrl: 'https://urafc.co.ug/',
    });
  } catch (e) {
    console.error('[ura-fc/matches GET]', e);
    return NextResponse.json({ error: 'Failed to load fixtures' }, { status: 500 });
  }
}
