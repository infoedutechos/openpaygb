/**
 * POST: send invite for a global task (create pending challenge). Creator's stake is deducted.
 * Body: { initData, creatorTeamId? | creatorLeagueId?, opponentTeamId? | opponentLeagueId?, creatorStake }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { GLOBAL_TASK_MIN_STAKE, GLOBAL_TASK_MAX_STAKE } from '@/utils/consts';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: globalTaskId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, creatorStake: rawStake } = body;
  let creatorTeamId = body.creatorTeamId;
  let creatorLeagueId = body.creatorLeagueId;
  let opponentTeamId = body.opponentTeamId;
  let opponentLeagueId = body.opponentLeagueId;

  // Trim IDs and treat empty string as missing
  creatorTeamId = typeof creatorTeamId === 'string' ? creatorTeamId.trim() || null : null;
  creatorLeagueId = typeof creatorLeagueId === 'string' ? creatorLeagueId.trim() || null : null;
  opponentTeamId = typeof opponentTeamId === 'string' ? opponentTeamId.trim() || null : null;
  opponentLeagueId = typeof opponentLeagueId === 'string' ? opponentLeagueId.trim() || null : null;

  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  const participantType = creatorTeamId ? 'team' : creatorLeagueId ? 'league' : null;
  if (!participantType || (participantType === 'team' && !creatorTeamId) || (participantType === 'league' && !creatorLeagueId)) {
    return NextResponse.json({ error: 'Provide creatorTeamId or creatorLeagueId' }, { status: 400 });
  }
  if ((opponentTeamId && opponentLeagueId) || !opponentTeamId && !opponentLeagueId) {
    return NextResponse.json({ error: 'Provide exactly one of opponentTeamId or opponentLeagueId' }, { status: 400 });
  }

  const creatorStake = Number(rawStake);
  if (!Number.isFinite(creatorStake) || creatorStake < GLOBAL_TASK_MIN_STAKE || creatorStake > GLOBAL_TASK_MAX_STAKE) {
    return NextResponse.json(
      { error: `Stake must be ${GLOBAL_TASK_MIN_STAKE.toLocaleString()}–${GLOBAL_TASK_MAX_STAKE.toLocaleString()} PEARLS` },
      { status: 400 }
    );
  }

  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const task = await prisma.globalTask.findUnique({ where: { id: globalTaskId } });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (task.participantType !== participantType) {
    return NextResponse.json({ error: 'Task participant type does not match' }, { status: 400 });
  }

  if (participantType === 'team') {
    const creatorTeam = await prisma.team.findUnique({ where: { id: creatorTeamId! }, select: { creatorId: true } });
    if (!creatorTeam || creatorTeam.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the team creator can send an invite' }, { status: 403 });
    const opponentTeam = await prisma.team.findUnique({ where: { id: opponentTeamId! }, select: { id: true } });
    if (!opponentTeam) return NextResponse.json({ error: 'Opponent team not found. Check the team or ask them to share their team from Browse teams.' }, { status: 404 });
    if (creatorTeamId === opponentTeamId) return NextResponse.json({ error: 'Cannot invite your own team' }, { status: 400 });
  } else {
    const creatorLeague = await prisma.userCreatedLeague.findUnique({ where: { id: creatorLeagueId! }, select: { creatorId: true } });
    if (!creatorLeague || creatorLeague.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only league creator can invite' }, { status: 403 });
    const opponentLeague = await prisma.userCreatedLeague.findUnique({ where: { id: opponentLeagueId! }, select: { id: true } });
    if (!opponentLeague) return NextResponse.json({ error: 'Opponent league not found. Check the league or ask them to share it from Browse leagues.' }, { status: 404 });
    if (creatorLeagueId === opponentLeagueId) return NextResponse.json({ error: 'Cannot invite your own league' }, { status: 400 });
  }

  const balance = dbUser.pointsBalance ?? 0;
  if (balance < creatorStake) return NextResponse.json({ error: 'Insufficient PEARLS balance' }, { status: 400 });

  const challenge = await prisma.globalTaskChallenge.create({
    data: {
      globalTaskId,
      creatorTeamId: participantType === 'team' ? creatorTeamId : null,
      creatorLeagueId: participantType === 'league' ? creatorLeagueId : null,
      opponentTeamId: participantType === 'team' ? opponentTeamId : null,
      opponentLeagueId: participantType === 'league' ? opponentLeagueId : null,
      creatorStake,
      opponentStake: 0,
      status: 'pending',
    },
  });

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: creatorStake } },
  });

  return NextResponse.json({
    success: true,
    challengeId: challenge.id,
    message: 'Invite sent. Opponent must accept and stake to start.',
  });
}
