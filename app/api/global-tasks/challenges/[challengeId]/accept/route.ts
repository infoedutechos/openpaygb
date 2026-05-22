/**
 * POST: accept invite (opponent stakes, snapshots taken, challenge goes active). No join after commence.
 * Body: { initData, opponentStake }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getProgressForTask } from '@/utils/global-tasks';
import { GLOBAL_TASK_MIN_STAKE, GLOBAL_TASK_MAX_STAKE } from '@/utils/consts';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, opponentStake: rawStake } = body;

  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const opponentStake = Number(rawStake);
  if (!Number.isFinite(opponentStake) || opponentStake < GLOBAL_TASK_MIN_STAKE || opponentStake > GLOBAL_TASK_MAX_STAKE) {
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

  const challenge = await prisma.globalTaskChallenge.findUnique({
    where: { id: challengeId },
    include: { task: true },
  });
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  if (challenge.status !== 'pending') return NextResponse.json({ error: 'Challenge not active or already started' }, { status: 400 });

  const task = challenge.task;
  const isTeam = task.participantType === 'team';
  const opponentId = isTeam ? challenge.opponentTeamId : challenge.opponentLeagueId;
  if (!opponentId) return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });

  if (isTeam) {
    const team = await prisma.team.findUnique({ where: { id: opponentId }, select: { creatorId: true } });
    if (!team || team.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only opponent team creator can accept' }, { status: 403 });
  } else {
    const league = await prisma.userCreatedLeague.findUnique({ where: { id: opponentId }, select: { creatorId: true } });
    if (!league || league.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only opponent league creator can accept' }, { status: 403 });
  }

  const balance = dbUser.pointsBalance ?? 0;
  if (balance < opponentStake) return NextResponse.json({ error: 'Insufficient PEARLS balance' }, { status: 400 });

  const creatorMetric = await getProgressForTask(
    prisma,
    task.participantType,
    task.metric,
    challenge.creatorTeamId,
    challenge.creatorLeagueId
  );
  const opponentMetric = await getProgressForTask(
    prisma,
    task.participantType,
    task.metric,
    challenge.opponentTeamId,
    challenge.opponentLeagueId
  );

  const startedAt = new Date();
  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + task.durationDays);

  const totalStakes = challenge.creatorStake + opponentStake;
  const bonusPercent = task.managementBonusPercent ?? 30;
  const managementBonusAmount = Math.floor((totalStakes * bonusPercent) / 100);
  const prizePool = totalStakes + managementBonusAmount;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: dbUser.id },
      data: { pointsBalance: { decrement: opponentStake } },
    }),
    prisma.globalTaskChallenge.update({
      where: { id: challengeId },
      data: {
        opponentStake,
        status: 'active',
        startedAt,
        endsAt,
        prizePool,
        managementBonusAmount,
      },
    }),
    prisma.globalTaskChallengeSnapshot.createMany({
      data: [
        {
          challengeId,
          teamId: challenge.creatorTeamId,
          leagueId: challenge.creatorLeagueId,
          metricValue: creatorMetric,
        },
        {
          challengeId,
          teamId: challenge.opponentTeamId,
          leagueId: challenge.opponentLeagueId,
          metricValue: opponentMetric,
        },
      ],
    }),
  ]);

  return NextResponse.json({
    success: true,
    challengeId,
    endsAt: endsAt.toISOString(),
    prizePool,
    message: 'Challenge started. First to reach target before end wins.',
  });
}
