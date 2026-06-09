import { NextResponse } from "next/server";
import { z } from "zod";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { registerGuestOpenPayCard } from "@/lib/guest-card-register";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  organizationSlug: z.string().min(2),
  email: z.string().email(),
  otp: z.string().min(4).max(12),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`guest-card-register:${ip}`, 12, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await assertActiveOrganizationSlug(parsed.data.organizationSlug.trim().toLowerCase());
    const result = await registerGuestOpenPayCard({
      organizationId: org.id,
      email: parsed.data.email,
      otp: parsed.data.otp,
    });

    return NextResponse.json({
      ok: true,
      studentId: result.studentId,
      card: {
        id: result.cardId,
        status: result.cardStatus,
        maskedPan: result.maskedPan,
      },
      nextStep: "Pay the card issue fee at /student/card or fund via MoMo/TON",
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "POST /api/public/guest-card/register",
      fallback: "Could not register guest card",
    });
  }
}
