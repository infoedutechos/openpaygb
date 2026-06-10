import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";
import { buildWorkspaceVerificationSteps } from "@/lib/workspace-verification-steps";
import { workspacePortalPath } from "@/lib/workspace-portal-url";

const Query = z.object({
  slug: z.string().min(2).max(64).optional(),
  email: z.string().email().optional(),
});

/** Public read-only workspace onboarding status (no PII beyond slug/name/status). */
export async function GET(req: Request) {
  try {
    if (rateLimitHit(`workspace-status:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(req.url);
    const parsed = Query.safeParse({
      slug: url.searchParams.get("slug")?.trim().toLowerCase(),
      email: url.searchParams.get("email")?.trim().toLowerCase(),
    });
    if (!parsed.success || (!parsed.data.slug && !parsed.data.email)) {
      return NextResponse.json({ error: "Provide slug or email" }, { status: 400 });
    }

    const org = parsed.data.slug
      ? await prisma.organization.findUnique({
          where: { slug: parsed.data.slug },
          select: {
            name: true,
            slug: true,
            tenantStatus: true,
            registrationEmailVerifiedAt: true,
          },
        })
      : await prisma.organization.findFirst({
          where: { registrationContactEmail: parsed.data.email },
          select: {
            name: true,
            slug: true,
            tenantStatus: true,
            registrationEmailVerifiedAt: true,
          },
          orderBy: { createdAt: "desc" },
        });

    if (!org) {
      return NextResponse.json({ found: false });
    }

    const policy = await getSchoolWorkspaceRegistrationPolicy();

    let nextSteps: string;
    if (org.tenantStatus === "active") {
      nextSteps =
        "Your workspace is active. Sign in at /school/login once your platform operator has created your admin account.";
    } else if (org.tenantStatus === "rejected") {
      nextSteps =
        "This workspace request was not approved. Contact ODEL HUB support if you believe this is an error.";
    } else if (!org.registrationEmailVerifiedAt) {
      nextSteps = policy.autoRegistrationEnabled
        ? "Verify your registration email. Your workspace will activate automatically after you confirm (no master approval step)."
        : "Verify your registration email, then wait for platform master approval.";
    } else if (policy.autoRegistrationEnabled) {
      nextSteps =
        "Email verified. Your workspace should activate shortly — refresh this page. Contact support if it stays pending.";
    } else {
      nextSteps = "Email verified. A platform operator will review and approve your school workspace.";
    }

    const verificationSteps = buildWorkspaceVerificationSteps(org, policy.autoRegistrationEnabled);

    return NextResponse.json({
      found: true,
      name: org.name,
      slug: org.slug,
      tenantStatus: org.tenantStatus,
      emailVerified: Boolean(org.registrationEmailVerifiedAt),
      autoRegistrationEnabled: policy.autoRegistrationEnabled,
      payUrl: `/pay/${org.slug}`,
      workspacePortalUrl: workspacePortalPath({
        slug: org.slug,
        email: parsed.data.email ?? undefined,
      }),
      verificationSteps,
      nextSteps,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "public/workspace-status", fallback: "Could not load status" });
  }
}
