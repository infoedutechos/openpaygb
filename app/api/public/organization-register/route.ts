import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import {
  createPendingOrganization,
  normalizeRegistrationContactEmail,
  pendingOrgPublicBodySchema,
} from "@/lib/organization-intake";
import { sendOrganizationRegistrationEmail } from "@/lib/organization-registration-email";
import { completeDeferredSchoolWorkspaceRegistration } from "@/lib/school-workspace-post-register";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";
import {
  issueOrganizationWorkspaceVerifyToken,
  organizationWorkspaceVerifyUrlForRequest,
} from "@/lib/organization-workspace-verify";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

export async function POST(req: Request) {
  try {
    await warmDeploymentEnvCache();
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

    if (policy.deferEmailVerification) {
      const deferred = await completeDeferredSchoolWorkspaceRegistration(
        org.id,
        org.slug,
        contactEmail,
        policy,
      );
      const refreshed = await prisma.organization.findUnique({
        where: { id: org.id },
        select: { tenantStatus: true },
      });
      return NextResponse.json(
        {
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            tenantStatus: refreshed?.tenantStatus ?? org.tenantStatus,
          },
          message: deferred.message,
          emailSent: false,
          deferEmailVerification: true,
          redirectUrl: deferred.redirectUrl,
          activated: deferred.activated,
          requireMasterApproval: policy.requireMasterApproval,
          autoRegistrationEnabled: policy.autoRegistrationEnabled,
          autoGenerateAdminLogin: policy.autoGenerateAdminLogin,
        },
        { status: 201 },
      );
    }

    const plain = await issueOrganizationWorkspaceVerifyToken(org.id);
    const emailSent = await sendOrganizationRegistrationEmail(
      contactEmail,
      {
        schoolName: org.name,
        slug: org.slug,
        contactEmail,
        note: (parsed.data.registrationNote ?? "").trim(),
        registeredAt: org.createdAt,
        autoRegistrationEnabled: policy.autoRegistrationEnabled,
      },
      plain,
      req,
    );

    const afterVerifyMessage = policy.requireMasterApproval
      ? "After you confirm, you will see your workspace status portal while a platform administrator reviews your request."
      : "After you confirm your email, your workspace will be activated automatically (programmes and fees copied from the platform template). The status portal will update when your workspace is live.";

    const payload: {
      organization: { id: string; name: string; slug: string; tenantStatus: string };
      message: string;
      emailSent: boolean;
      requireMasterApproval: boolean;
      autoRegistrationEnabled: boolean;
      deferEmailVerification: boolean;
      autoGenerateAdminLogin: boolean;
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
      deferEmailVerification: false,
      autoGenerateAdminLogin: policy.autoGenerateAdminLogin,
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
