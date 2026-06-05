import {
  organizationWorkspaceVerifyPath,
  organizationWorkspaceVerifyUrlForRequest,
} from "@/lib/organization-workspace-verify";
import { absoluteUrl } from "@/lib/public-url";
import {
  buildWorkspaceRegistrationEmailHtml,
  buildWorkspaceRegistrationEmailText,
  type WorkspaceRegistrationEmailDetails,
} from "@/lib/organization-registration-email-content";

export type { WorkspaceRegistrationEmailDetails } from "@/lib/organization-registration-email-content";
export { buildWorkspaceRegistrationEmailHtml, buildWorkspaceRegistrationEmailText } from "@/lib/organization-registration-email-content";

/**
 * Sends workspace registration confirmation via Resend when configured; logs link in development otherwise.
 */
export async function sendOrganizationRegistrationEmail(
  toEmail: string,
  details: WorkspaceRegistrationEmailDetails,
  plainToken: string,
  req?: Request,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const verifyUrl = req
    ? organizationWorkspaceVerifyUrlForRequest(req, plainToken)
    : absoluteUrl(organizationWorkspaceVerifyPath(plainToken));

  const html = buildWorkspaceRegistrationEmailHtml(details, verifyUrl);
  const text = buildWorkspaceRegistrationEmailText(details, verifyUrl);

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[organization-register] RESEND not configured; verification link for", toEmail, verifyUrl);
    } else {
      console.error("[organization-register] RESEND_API_KEY / RESEND_FROM missing; cannot email verification link");
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
      subject: "ODEL HUB — confirm your school workspace request",
      html,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[organization-register]", res.status, err);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[organization-register] verification link (dev fallback):", verifyUrl);
    }
    return false;
  }
  return true;
}
