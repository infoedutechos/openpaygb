import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/public-url";
import { sendMessageHtml } from "@/lib/telegram/client";
import { escapeHtml } from "@/lib/telegram/escape";

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

      const receiptUrl = absoluteUrl(`/receipt/${payment.id}`);
      const lines = [
        "<b>Payment confirmed</b>",
        "",
        `${escapeHtml(payment.programmeCode)} · Year ${payment.year} · Sem ${payment.semester}`,
        `<b>${payment.tonAmount} TON</b>`,
        payment.txHash ? `\n<code>${escapeHtml(payment.txHash)}</code>` : "",
        receiptUrl.startsWith("http") ? `\n<a href="${escapeHtml(receiptUrl)}">View receipt</a>` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await sendMessageHtml(chatId, lines);
    } catch (e) {
      console.error("[telegram notify]", e);
    }
  })();
}
