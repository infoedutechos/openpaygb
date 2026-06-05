import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

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

    return NextResponse.json({
      found: true,
      name: org.name,
      slug: org.slug,
      tenantStatus: org.tenantStatus,
      emailVerified: Boolean(org.registrationEmailVerifiedAt),
      payUrl: `/pay/${org.slug}`,
      nextSteps:
        org.tenantStatus === "active"
          ? "Your workspace is active. Sign in at /school/login once your platform operator has created your admin account."
          : org.tenantStatus === "rejected"
            ? "This workspace request was not approved. Contact ODEL HUB support if you believe this is an error."
            : org.registrationEmailVerifiedAt
              ? "Email verified. A platform operator will review and approve your school workspace."
              : "Verify your registration email, then wait for platform approval.",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "public/workspace-status", fallback: "Could not load status" });
  }
}
