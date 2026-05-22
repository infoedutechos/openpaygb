/**
 * GET: get team id and name by invite code (for Team vs Team challenge creation). ?code=XXX
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const team = await prisma.team.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true },
  });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  return NextResponse.json(team);
}
