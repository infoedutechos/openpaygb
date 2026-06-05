import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import {
  createPendingOrganization,
  normalizeRegistrationContactEmail,
  pendingOrgPublicBodySchema,
} from "@/lib/organization-intake";
import { sendOrganizationRegistrationEmail } from "@/lib/organization-registration-email";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";
import {
  issueOrganizationWorkspaceVerifyToken,
  organizationWorkspaceVerifyUrlForRequest,
} from "@/lib/organization-workspace-verify";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`org-register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = pendingOrgPublicBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const body = {
      ...parsed.data,
      registrationContactEmail: normalizeRegistrationContactEmail(parsed.data.registrationContactEmail),
    };
    const policy = await getSchoolWorkspaceRegistrationPolicy();
    const org = await createPendingOrganization(body);
    const contactEmail = body.registrationContactEmail;

    const plain = await issueOrganizationWorkspaceVerifyToken(org.id);
    const emailSent = await sendOrganizationRegistrationEmail(
      contactEmail,
      {
        schoolName: org.name,
        slug: org.slug,
        contactEmail,
        note: (parsed.data.registrationNote ?? "").trim(),
        registeredAt: org.createdAt,
      },
      plain,
      req,
    );

    const afterVerifyMessage = policy.requireMasterApproval
      ? "After you confirm, you will be directed to the school sign-in page while a platform administrator reviews your workspace."
      : "After you confirm your email, your workspace will be activated automatically (programmes and fees copied from the platform template). You can sign in at the school admin page once a platform operator creates your admin account.";

    const payload: {
      organization: { id: string; name: string; slug: string; tenantStatus: string };
      message: string;
      emailSent: boolean;
      requireMasterApproval: boolean;
      autoRegistrationEnabled: boolean;
      devConfirmUrl?: string;
    } = {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        tenantStatus: org.tenantStatus,
      },
      message: emailSent
        ? `Request received. Check your email for an ODEL HUB verification link with your registration details. ${afterVerifyMessage}`
        : "Request received. Configure RESEND_API_KEY and RESEND_FROM to send the verification email, or use the development link below.",
      emailSent,
      requireMasterApproval: policy.requireMasterApproval,
      autoRegistrationEnabled: policy.autoRegistrationEnabled,
    };

    if (!emailSent && process.env.NODE_ENV !== "production") {
      payload.devConfirmUrl = organizationWorkspaceVerifyUrlForRequest(req, plain);
    }

    if (!emailSent && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          ...payload,
          message:
            "Your workspace request was saved, but the verification email could not be sent. Use Resend verification on the registration page or contact platform support.",
          resendAvailable: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(payload, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "organization-register",
      fallback: "Could not register workspace",
    });
  }
}
