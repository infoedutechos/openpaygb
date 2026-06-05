import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { findPendingOrganizationByContactEmail } from "@/lib/organization-intake";
import { sendOrganizationRegistrationEmail } from "@/lib/organization-registration-email";
import {
  issueOrganizationWorkspaceVerifyToken,
  organizationWorkspaceVerifyUrlForRequest,
} from "@/lib/organization-workspace-verify";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  email: z.string().email(),
});

const GENERIC = "If a pending workspace exists for that email, a new verification link was sent.";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`org-register-resend:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const emailLower = parsed.data.email.trim().toLowerCase();
    const org = await findPendingOrganizationByContactEmail(emailLower);

    const payload: { ok: true; message: string; emailSent: boolean; devConfirmUrl?: string } = {
      ok: true,
      message: GENERIC,
      emailSent: false,
    };

    if (!org || org.registrationEmailVerifiedAt) {
      return NextResponse.json(payload);
    }

    const plain = await issueOrganizationWorkspaceVerifyToken(org.id);
    const emailSent = await sendOrganizationRegistrationEmail(
      emailLower,
      {
        schoolName: org.name,
        slug: org.slug,
        contactEmail: emailLower,
        note: org.registrationNote ?? "",
        registeredAt: org.createdAt,
      },
      plain,
      req,
    );
    payload.emailSent = emailSent;
    if (!emailSent && process.env.NODE_ENV !== "production") {
      payload.devConfirmUrl = organizationWorkspaceVerifyUrlForRequest(req, plain);
    }

    return NextResponse.json(payload);
  } catch (e) {
    return apiErrorResponse(e, { route: "organization-register/resend", fallback: "Server error" });
  }
}
