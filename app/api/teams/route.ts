/**
 * Teams: users can create teams (1M PEARLS commitment). Only teams can create leagues.
 * GET: list my teams (where I'm creator or member)
 * POST: create team (body: { initData, name }) -> id, name, inviteCode
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TEAM_CREATION_FEE } from '@/utils/consts';
import { generateInviteCode } from '@/utils/league-points';
import { getOrCreateFeeRecipientUser } from '@/utils/fee-recipient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  if (!initData) {
    return NextResponse.json({ teams: [] });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ teams: [] });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ teams: [] });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ teams: [] });

  const created = await prisma.team.findMany({
    where: { creatorId: dbUser.id },
    include: { members: { select: { userId: true } } },
  });
  const memberOf = await prisma.teamMember.findMany({
    where: { userId: dbUser.id },
    include: { team: { include: { members: { select: { userId: true } } } } },
  });
  const createdIds = new Set(created.map((t) => t.id));
  const teams = [
    ...created.map((t) => ({
      id: t.id,
      name: t.name,
      inviteCode: t.inviteCode,
      isCreator: true,
      memberCount: t.members.length,
    })),
    ...memberOf
      .filter((m) => !createdIds.has(m.team.id))
      .map((m) => ({
        id: m.team.id,
        name: m.team.name,
        inviteCode: m.team.inviteCode,
        isCreator: false,
        memberCount: m.team.members.length,
      })),
  ];

  return NextResponse.json({ teams });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, name, agreedToTerms } = body;

  if (!initData || !name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing initData or team name' }, { status: 400 });
  }
  if (agreedToTerms !== true) {
    return NextResponse.json({ error: 'You must agree to the Teams & Leagues Terms to create a team' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const balance = dbUser.pointsBalance ?? 0;
  if (balance < TEAM_CREATION_FEE) {
    return NextResponse.json(
      {
        error: `Team creation requires a commitment of ${TEAM_CREATION_FEE.toLocaleString()} PEARLS. Your balance: ${Math.floor(balance).toLocaleString()} PEARLS.`,
      },
      { status: 400 }
    );
  }

  const feeRecipient = await getOrCreateFeeRecipientUser(prisma);

  let inviteCode = generateInviteCode();
  let exists = await prisma.team.findUnique({ where: { inviteCode } });
  while (exists) {
    inviteCode = generateInviteCode();
    exists = await prisma.team.findUnique({ where: { inviteCode } });
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: TEAM_CREATION_FEE } },
  });
  await prisma.user.update({
    where: { id: feeRecipient.id },
    data: { pointsBalance: { increment: TEAM_CREATION_FEE } },
  });
  await prisma.treasuryTransaction.create({
    data: { amount: TEAM_CREATION_FEE, type: 'team_commitment', userId: dbUser.id },
  });

  const team = await prisma.team.create({
    data: {
      creatorId: dbUser.id,
      name: name.trim().slice(0, 80),
      inviteCode,
    },
  });

  await prisma.teamMember.create({
    data: { teamId: team.id, userId: dbUser.id },
  });

  return NextResponse.json({
    id: team.id,
    name: team.name,
    inviteCode,
  });
}
