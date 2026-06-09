import { NextResponse } from "next/server";
import { z } from "zod";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { issueGuestCardOtp } from "@/lib/guest-card-otp";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  organizationSlug: z.string().min(2),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(9).max(20),
  programmeCode: z.string().min(2).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`guest-card-otp:${ip}`, 8, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many OTP requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled || !settings.guestCardEnabled) {
      return NextResponse.json({ error: "Guest card registration is not available" }, { status: 503 });
    }

    const org = await assertActiveOrganizationSlug(parsed.data.organizationSlug.trim().toLowerCase());
    const { expiresAt } = await issueGuestCardOtp({
      organizationId: org.id,
      email: parsed.data.email,
      phone: parsed.data.phone,
      name: parsed.data.name,
      programmeCode: parsed.data.programmeCode,
    });

    return NextResponse.json({
      ok: true,
      message: "Verification code sent to your email",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/guest-card/send-otp" });
  }
}
