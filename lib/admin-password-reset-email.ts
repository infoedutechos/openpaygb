import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { absoluteUrl } from "@/lib/public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sends reset link via Resend when configured. In development without Resend, logs the URL.
 * @returns true if an email was sent
 */
export async function sendAdminPasswordResetEmail(toEmail: string, plainToken: string): Promise<boolean> {
  await warmDeploymentEnvCache();
  const apiKey = deploymentEnv("RESEND_API_KEY");
  const from = deploymentEnv("RESEND_FROM");
  const resetUrl = absoluteUrl(`/admin/reset-password?token=${encodeURIComponent(plainToken)}`);

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[admin-password-reset] RESEND not configured; reset link for", toEmail, resetUrl);
    } else {
      console.error("[admin-password-reset] RESEND_API_KEY / RESEND_FROM missing; cannot email reset link");
    }
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: "ODEL HUB — reset your admin password",
      html: `<p>You requested a password reset for ${escapeHtml(toEmail)}.</p>
<p><a href="${resetUrl}">Set a new password</a></p>
<p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
<p style="font-size:12px;color:#666">${escapeHtml(resetUrl)}</p>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[admin-password-reset]", res.status, err);
    return false;
  }
  return true;
}
