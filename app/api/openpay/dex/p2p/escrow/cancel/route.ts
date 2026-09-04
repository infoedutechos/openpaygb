import { NextRequest, NextResponse } from "next/server";
import { resolveOpenPayP2pActor } from "@/lib/openpay-p2p-actor";
import { cancelP2pEscrow } from "@/lib/dex-p2p-release";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const gate = await resolveOpenPayP2pActor(req);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = (await req.json()) as { escrowId?: string };
    if (!body.escrowId?.trim()) {
      return NextResponse.json({ error: "escrowId required" }, { status: 400 });
    }

    const result = await cancelP2pEscrow({
      escrowId: body.escrowId.trim(),
      actorStudentId: gate.actor.studentId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      escrowId: result.escrowId,
      message: result.message,
      actor: gate.actor.kind,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/openpay/dex/p2p/escrow/cancel" });
  }
}
