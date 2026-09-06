import { absoluteUrl, getPublicOrigin } from "@/lib/public-url";
import { sendTransactionalEmail } from "@/lib/transactional-email";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Path-only verify URL (same host in browser). */
export function studentSignupVerifyPath(plainToken: string): string {
  return `/api/auth/student-signup/verify?token=${encodeURIComponent(plainToken)}`;
}

/**
 * Absolute confirmation URL for emails and logs. Uses env origin when set; otherwise the incoming request origin
 * (so local `next dev` links work without `NEXT_PUBLIC_APP_URL`).
 */
export function studentSignupVerifyUrlForRequest(req: Request, plainToken: string): string {
  const path = studentSignupVerifyPath(plainToken);
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(req.url);
    return `${url.origin}${path}`;
  }
  const envOrigin = getPublicOrigin();
  if (envOrigin) return `${envOrigin}${path}`;
  const url = new URL(req.url);
  return `${url.origin}${path}`;
}

/**
 * Sends confirmation link via Brevo or Resend when configured; otherwise logs in development.
 * Link hits GET `/api/auth/student-signup/verify` which sets the signup session cookie and redirects to `/student/guest`.
 */
export async function sendStudentSignupEmail(toEmail: string, plainToken: string): Promise<boolean> {
  const verifyUrl = absoluteUrl(studentSignupVerifyPath(plainToken));

  const sent = await sendTransactionalEmail({
    to: toEmail,
    subject: "ODELPay HUB — confirm your student account",
    html: `<p>Hi ${escapeHtml(toEmail)},</p>
<p>Confirm your email to continue setting up your student portal (choose your school next).</p>
<p><a href="${verifyUrl}">Confirm email and continue</a></p>
<p>This link expires in 48 hours. If you did not register, you can ignore this email.</p>
<p style="font-size:12px;color:#666">${escapeHtml(verifyUrl)}</p>`,
    logTag: "[student-signup]",
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.warn("[student-signup] confirmation link (dev fallback):", toEmail, verifyUrl);
  }
  return sent;
}
