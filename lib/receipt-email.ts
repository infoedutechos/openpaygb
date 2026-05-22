import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/public-url";

/** Send Resend email when RESEND_API_KEY + RESEND_FROM are set and student has email. */
export async function sendReceiptEmailIfConfigured(paymentId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { name: true, email: true } } },
  });
  if (!payment || payment.status !== "confirmed") return;
  const email = payment.student.email?.trim();
  if (!email || !email.includes("@")) return;

  const receiptUrl = absoluteUrl(`/receipt/${payment.id}`);
  const pdfUrl = absoluteUrl(`/api/receipts/${payment.id}/pdf`);

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
<li>Programme: ${escapeHtml(payment.programmeCode)} · Year ${payment.year} · Semester ${payment.semester}</li>
<li>TON: ${payment.tonAmount}</li>
<li>Tx: ${escapeHtml(payment.txHash || "—")}</li>
</ul>
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
