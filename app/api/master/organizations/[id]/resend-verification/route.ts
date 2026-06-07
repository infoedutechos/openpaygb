import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import { sendOrganizationRegistrationEmail } from "@/lib/organization-registration-email";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";
import {
  issueOrganizationWorkspaceVerifyToken,
  organizationWorkspaceVerifyUrlForRequest,
} from "@/lib/organization-workspace-verify";

/** Master Admin: resend workspace email verification for a pending, unverified org. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const { id } = await ctx.params;
    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        tenantStatus: true,
        registrationContactEmail: true,
        registrationNote: true,
        registrationEmailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    if (org.tenantStatus !== "pending") {
      return NextResponse.json({ error: "Only pending workspaces can receive a verification resend" }, { status: 409 });
    }
    if (org.registrationEmailVerifiedAt) {
      return NextResponse.json({ error: "Email is already verified for this workspace" }, { status: 409 });
    }
    const email = org.registrationContactEmail?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "No registration contact email on file" }, { status: 400 });
    }

    const policy = await getSchoolWorkspaceRegistrationPolicy();
    const plain = await issueOrganizationWorkspaceVerifyToken(org.id);
    const emailSent = await sendOrganizationRegistrationEmail(
      email,
      {
        schoolName: org.name,
        slug: org.slug,
        contactEmail: email,
        note: org.registrationNote ?? "",
        registeredAt: org.createdAt,
        autoRegistrationEnabled: policy.autoRegistrationEnabled,
      },
      plain,
      req,
    );

    const payload: {
      ok: true;
      emailSent: boolean;
      message: string;
      devConfirmUrl?: string;
    } = {
      ok: true,
      emailSent,
      message: emailSent
        ? `Verification email sent to ${email}.`
        : "Email provider not configured (RESEND_API_KEY / RESEND_FROM). Use the development link if shown.",
    };

    if (!emailSent && process.env.NODE_ENV !== "production") {
      payload.devConfirmUrl = organizationWorkspaceVerifyUrlForRequest(req, plain);
    }

    return NextResponse.json(payload);
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/organizations/[id]/resend-verification" });
  }
}
