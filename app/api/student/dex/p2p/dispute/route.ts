import { NextRequest, NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { escalateP2pDispute } from "@/lib/dex-p2p-release";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = (await req.json()) as { escrowId?: string; reason?: string };
    if (!body.escrowId?.trim()) {
      return NextResponse.json({ error: "escrowId required" }, { status: 400 });
    }
    if (!body.reason?.trim()) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }

    const result = await escalateP2pDispute({
      escrowId: body.escrowId.trim(),
      escalatedBy: session.sub,
      reason: body.reason.trim(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      disputeId: result.disputeId,
      message: result.message,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/dex/p2p/dispute" });
  }
}
