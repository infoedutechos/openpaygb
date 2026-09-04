import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOpenPayHolder } from "@/lib/admin-openpay-api";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { startOpenPayCardMomoTopup } from "@/lib/openpay-card-momo-topup";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import {
  normalizeCardMomoPhone,
  openPayCardMomoRailSchema,
  resolveAndValidateCardMomoRail,
} from "@/lib/openpay-card-momo-route";
import { ensureOpenPayCardMomoProductActive } from "@/lib/openpay-card-momo-ready";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  amountUgx: z.number().int().min(1000).max(500_000_000),
  rail: openPayCardMomoRailSchema.optional(),
  phone: z.string().min(9).max(20),
  network: z.enum(["mtn", "airtel"]).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`admin-opcard-momo-fund:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const gate = await requireAdminOpenPayHolder(req);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    await ensureOpenPayCardMomoProductActive();
    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "OpenPayGB card is not available" }, { status: 503 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const card = await getStudentOpenPayCard(gate.holder.studentId);
    if (!card || card.status !== "active") {
      return NextResponse.json({ error: "Activate your OpenPayGB card before adding funds" }, { status: 409 });
    }

    const railGate = resolveAndValidateCardMomoRail(parsed.data.rail || "sandbox");
    if (!railGate.ok) {
      return NextResponse.json({ error: railGate.error }, { status: railGate.status });
    }
    const phoneGate = normalizeCardMomoPhone(railGate.rail, parsed.data.phone);
    if (!phoneGate.ok) {
      return NextResponse.json({ error: phoneGate.error }, { status: 400 });
    }

    const started = await startOpenPayCardMomoTopup({
      cardId: card.id,
      amountUgx: parsed.data.amountUgx,
      rail: railGate.rail,
      phone: phoneGate.phone,
      network: parsed.data.network?.toUpperCase() as "MTN" | "AIRTEL" | undefined,
      customerEmail: gate.holder.email || undefined,
      customerName: gate.holder.name || undefined,
    });

    return NextResponse.json({
      topupId: started.topupId,
      amountUgx: parsed.data.amountUgx,
      rail: started.rail,
      sandbox: started.sandbox === true,
      message: started.message,
      reference: started.reference,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/openpay-card/fund/momo-start" });
  }
}
