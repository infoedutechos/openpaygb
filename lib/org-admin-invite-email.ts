import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { absoluteUrl } from "@/lib/public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type OrgAdminInviteEmailDetails = {
  adminEmail: string;
  schoolName: string;
  schoolSlug: string;
  /** One-time password set link (72h) — never email plaintext passwords. */
  resetUrl: string;
};

export function buildOrgAdminInviteEmailHtml(details: OrgAdminInviteEmailDetails, loginUrl: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;color:#0f172a;line-height:1.5">
<p style="font-size:12px;font-weight:600;letter-spacing:0.2em;color:#0891b2;text-transform:uppercase">ODEL HUB</p>
<h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Your school admin account is ready</h1>
<p>Your workspace for <strong>${escapeHtml(details.schoolName)}</strong> has been approved. Set your password using the secure link below, then sign in to the ODEL HUB school admin dashboard.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <tbody>
    <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b;width:38%">School</td><td style="padding:6px 12px">${escapeHtml(details.schoolName)}</td></tr>
    <tr><td style="padding:6px 12px;color:#64748b">Pay URL slug</td><td style="padding:6px 12px;font-family:ui-monospace,monospace">${escapeHtml(details.schoolSlug)}</td></tr>
    <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b">Sign-in email</td><td style="padding:6px 12px">${escapeHtml(details.adminEmail)}</td></tr>
  </tbody>
</table>
<p><a href="${escapeHtml(details.resetUrl)}" style="display:inline-block;background:linear-gradient(90deg,#06b6d4,#0284c7);color:#020617;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px">Set your password</a></p>
<p style="font-size:13px;color:#64748b">After setting your password, sign in at <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>
<p style="font-size:13px;color:#64748b">Guest pay for your school: <span style="font-family:ui-monospace,monospace">/pay/${escapeHtml(details.schoolSlug)}</span></p>
<p style="font-size:12px;color:#94a3b8">This link expires in 72 hours. If you did not expect this email, contact your platform operator.</p>
</div>`;
}

export function buildOrgAdminInviteEmailText(details: OrgAdminInviteEmailDetails, loginUrl: string): string {
  return [
    "ODEL HUB — Your school admin account is ready",
    "",
    `School: ${details.schoolName}`,
    `Pay slug: ${details.schoolSlug}`,
    `Sign-in email: ${details.adminEmail}`,
    "",
    `Set your password (expires in 72h): ${details.resetUrl}`,
    `Sign in: ${loginUrl}`,
    "",
    `Guest pay: /pay/${details.schoolSlug}`,
  ].join("\n");
}

/** Sends school admin invite via Resend with a one-time password-set link. */
export async function sendOrgAdminInviteEmail(
  details: OrgAdminInviteEmailDetails,
): Promise<boolean> {
  const { deploymentEnv, warmDeploymentEnvCache } = await import("@/lib/deployment-env-resolve");
  await warmDeploymentEnvCache();
  const apiKey = deploymentEnv("RESEND_API_KEY");
  const from = deploymentEnv("RESEND_FROM");
  const loginUrl = absoluteUrl(PUBLIC_SCHOOL_LOGIN_PATH);

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[org-admin-invite] RESEND not configured; reset link for",
        details.adminEmail,
        details.resetUrl,
      );
    } else {
      console.error("[org-admin-invite] RESEND_API_KEY / RESEND_FROM missing");
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
      to: [details.adminEmail],
      subject: `ODEL HUB — set your password for ${details.schoolName}`,
      html: buildOrgAdminInviteEmailHtml(details, loginUrl),
      text: buildOrgAdminInviteEmailText(details, loginUrl),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[org-admin-invite]", res.status, err);
    return false;
  }
  return true;
}
