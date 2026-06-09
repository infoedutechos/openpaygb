import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/public-url";
import { sendMessageHtml } from "@/lib/telegram/client";
import { escapeHtml } from "@/lib/telegram/escape";
import { createReceiptAccessToken } from "@/lib/receipt-access";
import { resolvedBotToken, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { serializeStudentBalance } from "@/lib/tuition-balance-json";
import {
  cardTopupMessage,
  paymentConfirmedMessage,
  receiptReadyMessage,
  tuitionDueReminderMessage,
} from "@/lib/telegram/templates";
import { buildStudentProgrammeProgress } from "@/lib/tuition-progress";

function chatIdFromTelegramId(telegramId: string): number | null {
  const tid = telegramId.trim();
  if (!tid) return null;
  const chatId = Number(tid);
  return Number.isFinite(chatId) ? chatId : null;
}

async function sendToTelegramId(telegramId: string, html: string): Promise<boolean> {
  await warmDeploymentEnvCache();
  if (!resolvedBotToken()) return false;
  const chatId = chatIdFromTelegramId(telegramId);
  if (chatId == null) return false;
  await sendMessageHtml(chatId, html);
  return true;
}

/** Notify student that OpenPayGB card balance increased. */
export function notifyTelegramCardTopup(topupId: string): void {
  void (async () => {
    try {
      const topup = await prisma.openPayCardTopup.findUnique({
        where: { id: topupId },
        include: { card: { include: { student: true } } },
      });
      if (!topup || topup.status !== "confirmed") return;
      if (topup.memo.startsWith("opcardissuemomo:")) return;
      const student = topup.card.student;
      const tid = student.telegramId?.trim();
      if (!tid) return;
      await sendToTelegramId(
        tid,
        cardTopupMessage({
          amountUgx: topup.amountUgx,
          newBalanceUgx: topup.card.balanceUgx,
          maskedPan: topup.card.maskedPan ?? undefined,
          studentName: student.name,
        }),
      );
    } catch (e) {
      console.error("[telegram card topup notify]", e);
    }
  })();
}

/** Send tuition due reminder to one student; updates `telegramDueReminderAt` on success. */
export async function sendTelegramTuitionDueReminder(studentId: string): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { organization: { select: { name: true } } },
  });
  if (!student) return false;
  const tid = student.telegramId?.trim();
  if (!tid) return false;

  const summary = await getStudentBalanceSummary({
    studentId: student.id,
    organizationId: student.organizationId,
    programmeCode: student.programmeCode,
    year: student.year,
    semester: student.semester,
  });
  if (!summary) return false;
  const serialized = serializeStudentBalance(summary);
  const ctx = serialized.contexts[0];
  const outstandingUgx = ctx?.remainingSubtotalUgx ?? 0;
  if (outstandingUgx <= 0) return false;

  const nextPlan = serialized.installmentPlans.find((p) => p.remainingTotalUgx > 0);
  const html = tuitionDueReminderMessage({
    studentName: student.name,
    organizationName: student.organization.name,
    programmeCode: student.programmeCode,
    outstandingUgx,
    installmentLabel: nextPlan
      ? `${nextPlan.programmeCode} Y${nextPlan.year} S${nextPlan.semester}`
      : undefined,
    installmentUgx: nextPlan?.remainingTotalUgx,
  });

  const sent = await sendToTelegramId(tid, html);
  if (sent) {
    await prisma.student.update({
      where: { id: student.id },
      data: { telegramDueReminderAt: new Date() },
    });
  }
  return sent;
}

/** Enhanced payment confirmed — templates + receipt ready follow-up. */
export async function buildPaymentConfirmedMessages(paymentId: string): Promise<string | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: true },
  });
  if (!payment || payment.status !== "confirmed") return null;

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
  const pdfUrl = absoluteUrl(`/api/receipts/${payment.id}/pdf${tokenQs}`);

  const periodLine =
    progress && progress.totalSemesters > 0
      ? `${escapeHtml(payment.programmeCode)} · Year ${payment.year} of ${progress.durationYears} · Sem ${payment.semester} of ${progress.semestersPerYear}`
      : `${escapeHtml(payment.programmeCode)} · Year ${payment.year} · Sem ${payment.semester}`;

  const progressLine = progress
    ? `\n<b>Progress:</b> ${progress.completedSemesters} of ${progress.totalSemesters} semesters`
    : "";

  const methodLabel =
    payment.rail === "openpay_card"
      ? "OpenPay Card"
      : payment.rail === "livepay" || payment.rail === "mbiyo" || payment.rail === "relworx" || payment.rail === "vixonpay"
        ? "Mobile Money"
        : payment.rail === "telegram"
          ? "Telegram"
          : "TON Wallet";

  const main = paymentConfirmedMessage({
    programmeCode: payment.programmeCode,
    year: payment.year,
    semester: payment.semester,
    tonAmount: payment.tonAmount,
    totalUgx: payment.totalUgx ?? undefined,
    txHash: payment.txHash,
    receiptUrl,
    periodLine,
    progressLine,
  });

  const receipt = receiptReadyMessage({
    receiptId: payment.id,
    studentName: payment.student.name,
    amountUgx: payment.totalUgx ?? 0,
    methodLabel,
    receiptUrl,
    pdfUrl,
  });

  return `${main}\n\n${receipt}`;
}
