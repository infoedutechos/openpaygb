import { absoluteUrl, getPublicOrigin } from "@/lib/public-url";

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
 * Sends confirmation link via Resend when configured; otherwise logs in development.
 * Link hits GET `/api/auth/student-signup/verify` which sets the signup session cookie and redirects to `/student/guest`.
 */
export async function sendStudentSignupEmail(toEmail: string, plainToken: string): Promise<boolean> {
  const { deploymentEnv, warmDeploymentEnvCache } = await import("@/lib/deployment-env-resolve");
  await warmDeploymentEnvCache();
  const apiKey = deploymentEnv("RESEND_API_KEY");
  const from = deploymentEnv("RESEND_FROM");
  const verifyUrl = absoluteUrl(studentSignupVerifyPath(plainToken));

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[student-signup] RESEND not configured; confirmation link for", toEmail, verifyUrl);
    } else {
      console.error("[student-signup] RESEND_API_KEY / RESEND_FROM missing; cannot email confirmation link");
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
      subject: "ODEL HUB — confirm your student account",
      html: `<p>Hi ${escapeHtml(toEmail)},</p>
<p>Confirm your email to continue setting up your student portal (choose your school next).</p>
<p><a href="${verifyUrl}">Confirm email and continue</a></p>
<p>This link expires in 48 hours. If you did not register, you can ignore this email.</p>
<p style="font-size:12px;color:#666">${escapeHtml(verifyUrl)}</p>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[student-signup]", res.status, err);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[student-signup] confirmation link (dev fallback after send failure):", verifyUrl);
    }
    return false;
  }
  return true;
}
