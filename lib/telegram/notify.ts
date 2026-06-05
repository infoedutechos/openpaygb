import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/public-url";
import { sendMessageHtml } from "@/lib/telegram/client";
import { escapeHtml } from "@/lib/telegram/escape";
import { buildStudentProgrammeProgress } from "@/lib/tuition-progress";
import { createReceiptAccessToken } from "@/lib/receipt-access";

/** Fire-and-forget: tell a payer on Telegram that a payment was confirmed. */
export function notifyTelegramPaymentConfirmed(paymentId: string): void {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) return;

  void (async () => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { student: true },
      });
      if (!payment || payment.status !== "confirmed") return;
      const tid = payment.student.telegramId?.trim();
      if (!tid) return;
      const chatId = Number(tid);
      if (!Number.isFinite(chatId)) return;

      /** Resolve programme + per-student payments so the message can show updated programme progress. */
      const programme = await prisma.programme.findUnique({
        where: {
          organizationId_code: { organizationId: payment.organizationId, code: payment.programmeCode },
        },
        include: { fees: true },
      });
      const studentPayments = programme
        ? await prisma.payment.findMany({
            where: {
              studentId: payment.studentId,
              programmeCode: payment.programmeCode,
              organizationId: payment.organizationId,
            },
          })
        : [];
      const progress = programme ? buildStudentProgrammeProgress(programme, studentPayments) : null;

      const token = createReceiptAccessToken({
        id: payment.id,
        studentId: payment.studentId,
        confirmedAt: payment.confirmedAt,
      });
      const tokenQs = token ? `?t=${encodeURIComponent(token)}` : "";
      const receiptUrl = absoluteUrl(`/receipt/${payment.id}${tokenQs}`);
      const periodLine =
        progress && progress.totalSemesters > 0
          ? `${escapeHtml(payment.programmeCode)} · Year ${payment.year} of ${progress.durationYears} · Sem ${payment.semester} of ${progress.semestersPerYear}`
          : `${escapeHtml(payment.programmeCode)} · Year ${payment.year} · Sem ${payment.semester}`;

      const progressLine = progress
        ? `\n<b>Progress:</b> ${progress.completedSemesters} of ${progress.totalSemesters} semesters · ${progress.completedYears} of ${progress.durationYears} year${progress.durationYears === 1 ? "" : "s"} completed`
        : "";

      const completionBanner = (() => {
        if (!progress || progress.totalSemesters <= 0) return "";
        if (progress.remainingSemesters === 0) {
          return "\n\n🎓 <b>Programme complete!</b> Every semester is now paid. Congratulations.";
        }
        const yearComplete = progress.completedPeriods.filter((p) => p.year === payment.year);
        if (yearComplete.length > 0 && yearComplete.length === progress.semestersPerYear) {
          return `\n\n✅ <b>Year ${payment.year} complete</b> — ${progress.remainingYears} year${progress.remainingYears === 1 ? "" : "s"} to go.`;
        }
        return "";
      })();

      const lines = [
        "<b>Payment confirmed</b>",
        "",
        periodLine,
        `<b>${payment.tonAmount} TON</b>`,
        progressLine,
        payment.txHash ? `\n<code>${escapeHtml(payment.txHash)}</code>` : "",
        receiptUrl.startsWith("http") ? `\n<a href="${escapeHtml(receiptUrl)}">View receipt</a>` : "",
        completionBanner,
      ]
        .filter(Boolean)
        .join("\n");

      await sendMessageHtml(chatId, lines);
    } catch (e) {
      console.error("[telegram notify]", e);
    }
  })();
}
