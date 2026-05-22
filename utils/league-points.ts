/**
 * Team points (TP) and League points (LP).
 * - Users in a team earn TP for activities (base amount).
 * - Users in a league (via team or direct member) also earn LP = base × LEAGUE_POINTS_MULTIPLIER (2×).
 * So: team-only user gets 10 TP; league user gets 10 TP + 20 LP for same activity.
 */

import type { PrismaClient } from '@prisma/client';
import { getWeekKey } from './week-utils';
import { LEAGUE_INVITE_CODE_LENGTH, LEAGUE_POINTS_MULTIPLIER } from './consts';

type PrismaForPoints = Pick<
  PrismaClient,
  'user' | 'userLeagueWeek' | 'userTeamWeek' | 'team' | 'teamMember' | 'userCreatedLeague' | 'leagueTeam' | 'userCreatedLeagueMember'
>;

export async function isUserInAnyTeam(prisma: PrismaForPoints, userId: string): Promise<boolean> {
  const created = await prisma.team.findMany({ where: { creatorId: userId }, select: { id: true } });
  if (created.length > 0) return true;
  const member = await prisma.teamMember.findFirst({ where: { userId }, select: { id: true } });
  return !!member;
}

export async function isUserInAnyLeague(prisma: PrismaForPoints, userId: string): Promise<boolean> {
  const asCreator = await prisma.userCreatedLeague.findFirst({ where: { creatorId: userId }, select: { id: true } });
  if (asCreator) return true;
  const asMember = await prisma.userCreatedLeagueMember.findFirst({ where: { userId }, select: { id: true } });
  if (asMember) return true;
  const myTeams = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  if (myTeams.length === 0) return false;
  const teamIds = myTeams.map((m) => m.teamId);
  const inLeagueTeam = await prisma.leagueTeam.findFirst({ where: { teamId: { in: teamIds } }, select: { id: true } });
  return !!inLeagueTeam;
}

export async function addTeamPoints(
  prisma: PrismaForPoints,
  userId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return;
  const weekKey = getWeekKey();
  await prisma.userTeamWeek.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    create: { userId, weekKey, teamPoints: amount },
    update: { teamPoints: { increment: amount }, lastUpdatedAt: new Date() },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { totalTeamPoints: { increment: amount } },
  });
}

export async function addLeaguePoints(
  prisma: PrismaForPoints,
  userId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return;
  const weekKey = getWeekKey();
  await prisma.userLeagueWeek.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    create: { userId, weekKey, leaguePoints: amount },
    update: { leaguePoints: { increment: amount }, lastUpdatedAt: new Date() },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { totalLeaguePoints: { increment: amount } },
  });
}

/**
 * Call this when a user completes an activity. Awards TP if user is in a team, and LP (2× base) if user is in a league.
 * Base amount is the TP value (e.g. LEAGUE_POINTS.dailyLogin = 10 → 10 TP, and if in league +20 LP).
 */
export async function addActivityPoints(prisma: PrismaForPoints, userId: string, baseTp: number): Promise<void> {
  if (baseTp <= 0) return;
  const [inTeam, inLeague] = await Promise.all([
    isUserInAnyTeam(prisma, userId),
    isUserInAnyLeague(prisma, userId),
  ]);
  if (inTeam) await addTeamPoints(prisma, userId, baseTp);
  if (inLeague) await addLeaguePoints(prisma, userId, baseTp * LEAGUE_POINTS_MULTIPLIER);
}

/** Generate a short alphanumeric invite code for user-created leagues */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0,O,1,I
  let code = '';
  for (let i = 0; i < LEAGUE_INVITE_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
