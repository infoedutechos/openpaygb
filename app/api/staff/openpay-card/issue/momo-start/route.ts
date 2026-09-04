import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffOpenPayHolder } from "@/lib/staff-openpay-api";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { openPayCardIssueFeeUgx } from "@/lib/openpay-card-issue-fee";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { startOpenPayCardMomoTopup } from "@/lib/openpay-card-momo-topup";
import {
  normalizeCardMomoPhone,
  openPayCardMomoRailSchema,
  resolveAndValidateCardMomoRail,
} from "@/lib/openpay-card-momo-route";
import { ensureOpenPayCardMomoProductActive } from "@/lib/openpay-card-momo-ready";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  rail: openPayCardMomoRailSchema.optional(),
  phone: z.string().min(9).max(20),
  network: z.enum(["mtn", "airtel"]).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`staff-opcard-momo-issue:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const gate = await requireStaffOpenPayHolder();
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
    if (!card || card.status !== "pending_issue") {
      return NextResponse.json(
        { error: "Reserve your card first, or it is already active" },
        { status: 409 },
      );
    }

    const railGate = resolveAndValidateCardMomoRail(parsed.data.rail || "sandbox");
    if (!railGate.ok) {
      return NextResponse.json({ error: railGate.error }, { status: railGate.status });
    }
    const phoneGate = normalizeCardMomoPhone(railGate.rail, parsed.data.phone);
    if (!phoneGate.ok) {
      return NextResponse.json({ error: phoneGate.error }, { status: 400 });
    }

    const issueFeeTon = card.issueFeeTon ?? settings.issueFeeTon;
    const fee = await openPayCardIssueFeeUgx(issueFeeTon, gate.holder.organizationId);

    const started = await startOpenPayCardMomoTopup({
      cardId: card.id,
      amountUgx: fee.amountUgx,
      rail: railGate.rail,
      phone: phoneGate.phone,
      network: parsed.data.network?.toUpperCase() as "MTN" | "AIRTEL" | undefined,
      customerEmail: gate.holder.email || undefined,
      customerName: gate.holder.name || undefined,
      purpose: "issue",
    });

    return NextResponse.json({
      topupId: started.topupId,
      amountUgx: fee.amountUgx,
      issueFeeTon,
      rail: started.rail,
      sandbox: started.sandbox === true,
      message: started.message,
      reference: started.reference,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/staff/openpay-card/issue/momo-start" });
  }
}
