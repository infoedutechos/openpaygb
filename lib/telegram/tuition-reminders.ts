import { prisma } from "@/lib/prisma";
import { sendTelegramTuitionDueReminder } from "@/lib/telegram/notify-extended";

const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type TuitionReminderRunResult = {
  scanned: number;
  sent: number;
  skippedRecent: number;
  skippedNoBalance: number;
  errors: number;
};

/** Scan students with Telegram linked and outstanding tuition; send due reminders. */
export async function runTelegramTuitionDueReminders(): Promise<TuitionReminderRunResult> {
  const cutoff = new Date(Date.now() - REMINDER_COOLDOWN_MS);
  const students = await prisma.student.findMany({
    where: {
      telegramId: { not: "" },
      OR: [{ telegramDueReminderAt: null }, { telegramDueReminderAt: { lt: cutoff } }],
    },
    select: { id: true },
    take: 200,
  });

  const result: TuitionReminderRunResult = {
    scanned: students.length,
    sent: 0,
    skippedRecent: 0,
    skippedNoBalance: 0,
    errors: 0,
  };

  for (const row of students) {
    try {
      const sent = await sendTelegramTuitionDueReminder(row.id);
      if (sent) result.sent += 1;
      else result.skippedNoBalance += 1;
    } catch {
      result.errors += 1;
    }
  }

  return result;
}
