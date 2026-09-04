import { NextRequest, NextResponse } from "next/server";
import { resolveOpenPayP2pActor } from "@/lib/openpay-p2p-actor";
import { acceptP2pEscrow } from "@/lib/dex-p2p-escrow";
import { apiErrorResponse } from "@/lib/api-error";

/** Accept a P2P offer and hold OPGB in escrow — any OpenPayGB card holder. */
export async function POST(req: NextRequest) {
  try {
    const gate = await resolveOpenPayP2pActor(req);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = (await req.json()) as { offerId?: string };
    if (!body.offerId?.trim()) {
      return NextResponse.json({ error: "offerId is required" }, { status: 400 });
    }

    const result = await acceptP2pEscrow({
      offerId: body.offerId.trim(),
      takerStudentId: gate.actor.studentId,
      organizationId: gate.actor.organizationId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      escrowId: result.escrowId,
      referenceKey: result.referenceKey,
      message: result.message,
      actor: gate.actor.kind,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/openpay/dex/p2p/escrow" });
  }
}
