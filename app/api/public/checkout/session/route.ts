import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { adminCanAccessStudentOrganization } from "@/lib/admin-org-scope";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import {
  attachCheckoutSessionCookie,
  signCheckoutSession,
} from "@/lib/checkout-session";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  organizationSlug: z.string().min(2),
  studentId: z.string().min(1),
  /** Required when the student record has an email on file. */
  email: z.string().email().optional(),
});

/**
 * Establish a guest checkout session (e.g. resume pay with studentId from a link).
 * Verifies email when the student has one registered.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`checkout-session:${ip}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await assertActiveOrganizationSlug(parsed.data.organizationSlug.trim().toLowerCase());
    const student = await prisma.student.findFirst({
      where: { id: parsed.data.studentId, organizationId: org.id },
      select: { id: true, email: true, organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    let admin: Awaited<ReturnType<typeof getAdminFromCookies>> = null;
    try {
      admin = await getAdminFromCookies();
    } catch {
      admin = null;
    }
    const adminMayResume =
      admin &&
      (await adminCanAccessStudentOrganization(admin.sub, admin.role, student.organizationId));

    const recordEmail = student.email.trim().toLowerCase();
    if (!recordEmail && !adminMayResume) {
      return NextResponse.json(
        {
          error:
            "This student has no email on file. Contact your school for a secure checkout link, or sign in as school admin to resume payment.",
        },
        { status: 403 },
      );
    }
    if (recordEmail && !adminMayResume) {
      const provided = (parsed.data.email ?? "").trim().toLowerCase();
      if (!provided) {
        return NextResponse.json({
          needsEmail: true,
          error: "Enter the email on file for this student to resume checkout",
        });
      }
      if (provided !== recordEmail) {
        return NextResponse.json(
          { error: "That email does not match our records for this student" },
          { status: 403 },
        );
      }
    }

    const checkoutToken = await signCheckoutSession({
      sub: student.id,
      organizationId: student.organizationId,
    });

    const res = NextResponse.json({ ok: true, ...(adminMayResume ? { checkoutToken } : {}) });
    attachCheckoutSessionCookie(res, checkoutToken);
    return res;
  } catch (e) {
    return apiErrorResponse(e, {
      route: "checkout/session",
      fallback: "Could not start checkout session",
    });
  }
}
