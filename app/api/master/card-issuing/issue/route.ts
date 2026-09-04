import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import {
  issueNetworkCard,
  isCardIssuingConfigured,
  cardIssuingNotReadyMessage,
  visaVdpHelloWorld,
} from "@/lib/card-issuing";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  holderName: z.string().min(2).max(120),
  email: z.string().email(),
  phoneE164: z.string().min(8).max(20).optional(),
  studentId: z.string().optional(),
  organizationId: z.string().optional(),
  currency: z.enum(["UGX", "USD"]).optional(),
  clientReference: z.string().min(4).max(64).optional(),
  /** Connectivity probe only — does not issue a card */
  probeHelloWorld: z.boolean().optional(),
});

/** Master: probe Visa sandbox or issue a network card (no PAN stored). */
export async function POST(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    if (rateLimitHit(`master-card-issue:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.probeHelloWorld) {
      const hello = await visaVdpHelloWorld();
      return NextResponse.json({ probe: hello });
    }

    if (!isCardIssuingConfigured()) {
      return NextResponse.json(
        { error: cardIssuingNotReadyMessage(), code: "card_issuing_not_configured" },
        { status: 503 },
      );
    }

    const clientReference =
      parsed.data.clientReference?.trim() ||
      `opgb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const { result, recordId } = await issueNetworkCard({
      holderName: parsed.data.holderName.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      phoneE164: parsed.data.phoneE164,
      studentId: parsed.data.studentId,
      organizationId: parsed.data.organizationId,
      currency: parsed.data.currency,
      clientReference,
    });

    return NextResponse.json({ ok: true, recordId, card: result }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/card-issuing/issue", fallback: "Issue failed" });
  }
}
