import { prisma } from "@/lib/prisma";
import { sendMessageHtml } from "@/lib/telegram/client";
import { resolvedBotToken, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { buildPaymentConfirmedMessages } from "@/lib/telegram/notify-extended";

/** Fire-and-forget: tell a payer on Telegram that a payment was confirmed. */
export function notifyTelegramPaymentConfirmed(paymentId: string): void {
  void (async () => {
    try {
      await warmDeploymentEnvCache();
      if (!resolvedBotToken()) return;
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { student: true },
      });
      if (!payment || payment.status !== "confirmed") return;
      const tid = payment.student.telegramId?.trim();
      if (!tid) return;
      const chatId = Number(tid);
      if (!Number.isFinite(chatId)) return;

      const html = await buildPaymentConfirmedMessages(paymentId);
      if (!html) return;
      await sendMessageHtml(chatId, html);
    } catch (e) {
      console.error("[telegram notify]", e);
    }
  })();
}

export { notifyTelegramCardTopup, sendTelegramTuitionDueReminder } from "@/lib/telegram/notify-extended";
