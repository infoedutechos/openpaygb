import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromCookies } from "@/lib/student-auth";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { startOpenPayCardMomoTopup } from "@/lib/openpay-card-momo-topup";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { ugandaPhoneToE164 } from "@/lib/livepay/uganda-phone";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const E164 = z.string().regex(/^\+\d{10,15}$/);

const Body = z.object({
  amountUgx: z.number().int().min(1000).max(500_000_000),
  rail: z.enum(["livepay", "relworx"]),
  phone: z.string().min(9).max(20),
  network: z.enum(["mtn", "airtel"]).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`opcard-momo-fund:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "OpenPayGB card is not available" }, { status: 503 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const card = await getStudentOpenPayCard(session.sub);
    if (!card || card.status !== "active") {
      return NextResponse.json({ error: "Activate your OpenPayGB card before adding funds" }, { status: 409 });
    }

    if (parsed.data.rail === "livepay" && !isLivePayConfigured()) {
      return NextResponse.json({ error: "LivePay is not configured" }, { status: 503 });
    }
    if (parsed.data.rail === "relworx" && !isRelworxConfigured()) {
      return NextResponse.json({ error: "Relworx is not configured" }, { status: 503 });
    }

    const phone = ugandaPhoneToE164(parsed.data.phone.trim());
    if (!phone || !E164.safeParse(phone).success) {
      return NextResponse.json({ error: "Use a valid Uganda mobile number" }, { status: 400 });
    }

    const started = await startOpenPayCardMomoTopup({
      cardId: card.id,
      amountUgx: parsed.data.amountUgx,
      rail: parsed.data.rail,
      phone,
      network: parsed.data.network?.toUpperCase() as "MTN" | "AIRTEL" | undefined,
    });

    return NextResponse.json({
      topupId: started.topupId,
      amountUgx: parsed.data.amountUgx,
      rail: parsed.data.rail,
      message: started.message,
      reference: started.reference,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/openpay-card/fund/momo-start" });
  }
}
