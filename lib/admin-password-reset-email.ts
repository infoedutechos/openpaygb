import { absoluteUrl } from "@/lib/public-url";
import { sendTransactionalEmail } from "@/lib/transactional-email";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sends reset link via Brevo or Resend when configured. In development without email, logs the URL.
 * @returns true if an email was sent
 */
export async function sendAdminPasswordResetEmail(toEmail: string, plainToken: string): Promise<boolean> {
  const resetUrl = absoluteUrl(`/admin/reset-password?token=${encodeURIComponent(plainToken)}`);

  const sent = await sendTransactionalEmail({
    to: toEmail,
    subject: "ODELPay HUB — reset your admin password",
    html: `<p>You requested a password reset for ${escapeHtml(toEmail)}.</p>
<p><a href="${resetUrl}">Set a new password</a></p>
<p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
<p style="font-size:12px;color:#666">${escapeHtml(resetUrl)}</p>`,
    logTag: "[admin-password-reset]",
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.warn("[admin-password-reset] reset link (dev fallback):", toEmail, resetUrl);
  }
  return sent;
}
