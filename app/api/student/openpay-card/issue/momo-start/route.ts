import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromCookies } from "@/lib/student-auth";
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
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  rail: openPayCardMomoRailSchema.optional(),
  phone: z.string().min(9).max(20),
  network: z.enum(["mtn", "airtel"]).optional(),
});

/** Mobile money collection to activate a pending OpenPayGB card (issue fee in UGX). */
export async function POST(req: Request) {
  try {
    if (rateLimitHit(`opcard-momo-issue:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const card = await getStudentOpenPayCard(session.sub);
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

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { name: true, email: true, organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const issueFeeTon = card.issueFeeTon ?? settings.issueFeeTon;
    const fee = await openPayCardIssueFeeUgx(issueFeeTon, student.organizationId);

    const started = await startOpenPayCardMomoTopup({
      cardId: card.id,
      amountUgx: fee.amountUgx,
      rail: railGate.rail,
      phone: phoneGate.phone,
      network: parsed.data.network?.toUpperCase() as "MTN" | "AIRTEL" | undefined,
      customerEmail: student.email || undefined,
      customerName: student.name || undefined,
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
    return apiErrorResponse(e, { route: "POST /api/student/openpay-card/issue/momo-start" });
  }
}
