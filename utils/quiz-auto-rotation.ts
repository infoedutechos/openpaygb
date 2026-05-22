import prisma from '@/utils/prisma';

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse weekdays from settings; 0=Sun … 6=Sat (Date.getUTCDay()). Default Mon & Thu. */
export function parseAutoRotationWeekdays(s: string | null | undefined): number[] {
  if (!s || !String(s).trim()) return [1, 4];
  const parts = String(s)
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
  return parts.length ? parts : [1, 4];
}

/**
 * If auto-rotation is enabled and today (UTC) is a configured weekday and we have not rotated yet today,
 * pick N random questions as active (same as admin "Set N random").
 */
export async function maybeApplyAutomatedQuizRotation(): Promise<void> {
  let settings = await prisma.quizSettings.findFirst();
  if (!settings) {
    settings = await prisma.quizSettings.create({
      data: {
        completionBonusPoints: 0,
        autoRotationEnabled: false,
        autoRotationWeekdays: '1,4',
        autoRotationQuestionCount: 5,
      },
    });
  }

  if (!settings.autoRotationEnabled) return;

  const weekdays = parseAutoRotationWeekdays(settings.autoRotationWeekdays);
  const now = new Date();
  const weekday = now.getUTCDay();
  if (!weekdays.includes(weekday)) return;

  const todayStr = utcDateString(now);
  if (settings.lastAutoRotationUtcDate === todayStr) return;

  const count = Math.min(20, Math.max(1, settings.autoRotationQuestionCount ?? 5));
  const all = await prisma.quizQuestion.findMany({ select: { id: true } });
  if (all.length === 0) return;

  const ids = all.map((q) => q.id);
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const take = Math.min(count, ids.length);
  const activeIds = shuffled.slice(0, take);
  const inactiveIds = ids.filter((id) => !activeIds.includes(id));

  await prisma.quizQuestion.updateMany({ where: { id: { in: activeIds } }, data: { isActive: true } });
  if (inactiveIds.length > 0) {
    await prisma.quizQuestion.updateMany({ where: { id: { in: inactiveIds } }, data: { isActive: false } });
  }
  await prisma.quizSettings.update({
    where: { id: settings.id },
    data: { lastAutoRotationUtcDate: todayStr },
  });
}
