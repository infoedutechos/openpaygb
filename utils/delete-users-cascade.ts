import type { PrismaClient } from '@prisma/client';

/**
 * Hard-delete users and dependent rows (same steps as admin account delete).
 * Callers must validate authorization; this performs only DB cleanup.
 */
export async function deleteUsersCascade(prisma: PrismaClient, userObjIds: string[]): Promise<void> {
  if (userObjIds.length === 0) return;

  await prisma.user.updateMany({
    where: { referredById: { in: userObjIds } },
    data: { referredById: null },
  });
  await prisma.userTask.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userDailyCipherAttempt.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userDailyComboAttempt.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userCard.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userMiniGameAttempt.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.stake.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userWeeklyProgress.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.onchainTaskCompletion.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.treasuryTransaction.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.charityDonation.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.transfer.deleteMany({
    where: { OR: [{ senderId: { in: userObjIds } }, { recipientId: { in: userObjIds } }] },
  });
  await prisma.marketplaceListing.deleteMany({ where: { sellerId: { in: userObjIds } } });
  await prisma.marketplaceTrade.deleteMany({ where: { buyerId: { in: userObjIds } } });
  await prisma.userLeagueWeek.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userTeamWeek.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.leagueJoinRequest.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.teamJoinRequest.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.teamMember.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.teamModeration.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.leagueChallengeStake.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.leagueChallengeContribution.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userChallengeSnapshot.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.teamChallengeStake.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.teamChallengeContribution.deleteMany({ where: { userId: { in: userObjIds } } });
  await prisma.userTeamChallengeSnapshot.deleteMany({ where: { userId: { in: userObjIds } } });

  const leaguesByCreator = await prisma.userCreatedLeague.findMany({
    where: { creatorId: { in: userObjIds } },
    select: { id: true },
  });
  const leagueIds = leaguesByCreator.map((l) => l.id);
  if (leagueIds.length > 0) {
    const leagueChallenges = await prisma.leagueChallenge.findMany({
      where: { creatorLeagueId: { in: leagueIds } },
      select: { id: true },
    });
    const lcIds = leagueChallenges.map((c) => c.id);
    if (lcIds.length > 0) {
      await prisma.leagueChallengeStake.deleteMany({ where: { challengeId: { in: lcIds } } });
      await prisma.leagueChallengeContribution.deleteMany({ where: { challengeId: { in: lcIds } } });
      await prisma.userChallengeSnapshot.deleteMany({ where: { challengeId: { in: lcIds } } });
    }
    await prisma.leagueChallenge.deleteMany({ where: { creatorLeagueId: { in: leagueIds } } });
    await prisma.userCreatedLeagueMember.deleteMany({ where: { leagueId: { in: leagueIds } } });
    await prisma.leagueJoinRequest.deleteMany({ where: { leagueId: { in: leagueIds } } });
    await prisma.leagueTeam.deleteMany({ where: { leagueId: { in: leagueIds } } });
    await prisma.leagueModeration.deleteMany({ where: { leagueId: { in: leagueIds } } });
    const leagueOpinions = await prisma.leagueOpinion.findMany({ where: { leagueId: { in: leagueIds } }, select: { id: true } });
    const loIds = leagueOpinions.map((o) => o.id);
    if (loIds.length > 0) await prisma.leagueOpinionVote.deleteMany({ where: { opinionId: { in: loIds } } });
    await prisma.leagueOpinion.deleteMany({ where: { leagueId: { in: leagueIds } } });
    await prisma.leagueAnnouncement.deleteMany({ where: { leagueId: { in: leagueIds } } });
    await prisma.userCreatedLeague.deleteMany({ where: { id: { in: leagueIds } } });
  }

  const teamsByCreator = await prisma.team.findMany({
    where: { creatorId: { in: userObjIds } },
    select: { id: true },
  });
  const teamIds = teamsByCreator.map((t) => t.id);
  if (teamIds.length > 0) {
    const teamChallenges = await prisma.teamChallenge.findMany({
      where: { creatorTeamId: { in: teamIds } },
      select: { id: true },
    });
    const tcIds = teamChallenges.map((c) => c.id);
    if (tcIds.length > 0) {
      await prisma.teamChallengeStake.deleteMany({ where: { challengeId: { in: tcIds } } });
      await prisma.teamChallengeContribution.deleteMany({ where: { challengeId: { in: tcIds } } });
      await prisma.userTeamChallengeSnapshot.deleteMany({ where: { challengeId: { in: tcIds } } });
    }
    await prisma.teamChallenge.deleteMany({ where: { creatorTeamId: { in: teamIds } } });
    await prisma.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.teamJoinRequest.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.teamModeration.deleteMany({ where: { teamId: { in: teamIds } } });
    const teamOpinions = await prisma.teamOpinion.findMany({ where: { teamId: { in: teamIds } }, select: { id: true } });
    const toIds = teamOpinions.map((o) => o.id);
    if (toIds.length > 0) await prisma.teamOpinionVote.deleteMany({ where: { opinionId: { in: toIds } } });
    await prisma.teamOpinion.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.teamAnnouncement.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
  }

  await prisma.user.deleteMany({ where: { id: { in: userObjIds } } });
}
