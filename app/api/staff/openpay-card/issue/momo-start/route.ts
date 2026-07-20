import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffOpenPayHolder } from "@/lib/staff-openpay-api";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { openPayCardIssueFeeUgx } from "@/lib/openpay-card-issue-fee";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { startOpenPayCardMomoTopup } from "@/lib/openpay-card-momo-topup";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { isVixonPayConfigured } from "@/lib/vixonpay/client";
import { ugandaPhoneToE164 } from "@/lib/livepay/uganda-phone";
import { ugandaPhoneForVixonPay } from "@/lib/vixonpay/uganda-phone";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const E164 = z.string().regex(/^\+\d{10,15}$/);

const Body = z.object({
  rail: z.enum(["livepay", "relworx", "vixonpay"]),
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

    if (parsed.data.rail === "livepay" && !isLivePayConfigured()) {
      return NextResponse.json({ error: "LivePay is not configured" }, { status: 503 });
    }
    if (parsed.data.rail === "relworx" && !isRelworxConfigured()) {
      return NextResponse.json({ error: "Relworx is not configured" }, { status: 503 });
    }
    if (parsed.data.rail === "vixonpay" && !isVixonPayConfigured()) {
      return NextResponse.json({ error: "VixonPay is not configured" }, { status: 503 });
    }

    let phoneForRail: string;
    if (parsed.data.rail === "vixonpay") {
      const vixonPhone = ugandaPhoneForVixonPay(parsed.data.phone.trim());
      if (!vixonPhone) {
        return NextResponse.json({ error: "Use a valid Uganda mobile number" }, { status: 400 });
      }
      phoneForRail = vixonPhone;
    } else {
      const phone = ugandaPhoneToE164(parsed.data.phone.trim());
      if (!phone || !E164.safeParse(phone).success) {
        return NextResponse.json({ error: "Use a valid Uganda mobile number" }, { status: 400 });
      }
      phoneForRail = phone;
    }

    const issueFeeTon = card.issueFeeTon ?? settings.issueFeeTon;
    const fee = await openPayCardIssueFeeUgx(issueFeeTon, gate.holder.organizationId);

    const started = await startOpenPayCardMomoTopup({
      cardId: card.id,
      amountUgx: fee.amountUgx,
      rail: parsed.data.rail,
      phone: phoneForRail,
      network: parsed.data.network?.toUpperCase() as "MTN" | "AIRTEL" | undefined,
      customerEmail: gate.holder.email || undefined,
      customerName: gate.holder.name || undefined,
      purpose: "issue",
    });

    return NextResponse.json({
      topupId: started.topupId,
      amountUgx: fee.amountUgx,
      issueFeeTon,
      rail: parsed.data.rail,
      message: started.message,
      reference: started.reference,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/staff/openpay-card/issue/momo-start" });
  }
}
