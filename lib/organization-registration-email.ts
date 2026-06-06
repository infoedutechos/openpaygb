import { sendTransactionalEmail } from "@/lib/transactional-email";
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
 * Sends workspace registration confirmation via Brevo or Resend when configured; logs link in development otherwise.
 */
export async function sendOrganizationRegistrationEmail(
  toEmail: string,
  details: WorkspaceRegistrationEmailDetails,
  plainToken: string,
  req?: Request,
): Promise<boolean> {
  const verifyUrl = req
    ? organizationWorkspaceVerifyUrlForRequest(req, plainToken)
    : absoluteUrl(organizationWorkspaceVerifyPath(plainToken));

  const html = buildWorkspaceRegistrationEmailHtml(details, verifyUrl);
  const text = buildWorkspaceRegistrationEmailText(details, verifyUrl);

  const sent = await sendTransactionalEmail({
    to: toEmail,
    subject: "ODEL HUB — confirm your school workspace request",
    html,
    text,
    logTag: "[organization-register]",
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.warn("[organization-register] verification link (dev fallback):", verifyUrl);
  }
  return sent;
}
