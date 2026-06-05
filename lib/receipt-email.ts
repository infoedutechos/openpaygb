import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/public-url";
import { createReceiptAccessToken } from "@/lib/receipt-access";
import { receiptBreakdownHtml } from "@/lib/receipt-breakdown-html";
import { buildReceiptBreakdown } from "@/lib/receipt-lines";
import { buildStudentProgrammeProgress } from "@/lib/tuition-progress";

/** Send Resend email when RESEND_API_KEY + RESEND_FROM are set and student has email. */
export async function sendReceiptEmailIfConfigured(paymentId: string): Promise<void> {
  await warmDeploymentEnvCache();
  const apiKey = deploymentEnv("RESEND_API_KEY");
  const from = deploymentEnv("RESEND_FROM");
  if (!apiKey || !from) return;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { id: true, name: true, email: true } } },
  });
  if (!payment || payment.status !== "confirmed") return;
  const email = payment.student.email?.trim();
  if (!email || !email.includes("@")) return;

  const receiptToken = createReceiptAccessToken({
    id: payment.id,
    studentId: payment.studentId,
    confirmedAt: payment.confirmedAt,
  });
  const tokenQs = receiptToken ? `?t=${encodeURIComponent(receiptToken)}` : "";
  const receiptUrl = absoluteUrl(`/receipt/${payment.id}${tokenQs}`);
  const pdfUrl = absoluteUrl(`/api/receipts/${payment.id}/pdf${tokenQs}`);

  /** Build progress so the e-mail can mirror what the Telegram bot and the receipt page show. */
  const programme = await prisma.programme.findUnique({
    where: { organizationId_code: { organizationId: payment.organizationId, code: payment.programmeCode } },
    include: { fees: true },
  });
  const studentPayments = programme
    ? await prisma.payment.findMany({
        where: {
          studentId: payment.student.id,
          programmeCode: payment.programmeCode,
          organizationId: payment.organizationId,
        },
      })
    : [];
  const progress = programme ? buildStudentProgrammeProgress(programme, studentPayments) : null;
  const breakdown = buildReceiptBreakdown(payment, programme?.fees ?? []);
  const feeBreakdownBlock = receiptBreakdownHtml(breakdown);

  const periodLine =
    progress && progress.totalSemesters > 0
      ? `Programme: ${escapeHtml(payment.programmeCode)} · Year ${payment.year} of ${progress.durationYears} · Semester ${payment.semester} of ${progress.semestersPerYear}`
      : `Programme: ${escapeHtml(payment.programmeCode)} · Year ${payment.year} · Semester ${payment.semester}`;

  const progressBlock = progress
    ? `<li>Progress: ${progress.completedSemesters} of ${progress.totalSemesters} semesters · ${progress.completedYears} of ${progress.durationYears} year(s) completed</li>`
    : "";

  const completionBanner = (() => {
    if (!progress || progress.totalSemesters <= 0) return "";
    if (progress.remainingSemesters === 0) {
      return `<p style="margin-top:12px;padding:8px 12px;background:#ecfdf5;border-radius:8px;"><strong>Programme complete!</strong> Every semester is now paid. Congratulations.</p>`;
    }
    const yearComplete = progress.completedPeriods.filter((p) => p.year === payment.year);
    if (yearComplete.length > 0 && yearComplete.length === progress.semestersPerYear) {
      return `<p style="margin-top:12px;padding:8px 12px;background:#eff6ff;border-radius:8px;"><strong>Year ${payment.year} complete</strong> — ${progress.remainingYears} year(s) to go.</p>`;
    }
    return "";
  })();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `ODEL HUB — payment confirmed (${payment.programmeCode})`,
      html: `<p>Hi ${escapeHtml(payment.student.name)},</p>
<p>Your payment is <strong>confirmed</strong>.</p>
<ul>
<li>${periodLine}</li>
<li>Tx: ${escapeHtml(payment.txHash || "—")}</li>
${progressBlock}
</ul>
${feeBreakdownBlock}
${completionBanner}
<p><a href="${receiptUrl}">View receipt</a> · <a href="${pdfUrl}">Download PDF</a></p>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[receipt-email]", res.status, err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
