import { NextRequest, NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { releaseP2pEscrow } from "@/lib/dex-p2p-release";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = (await req.json()) as { escrowId?: string };
    if (!body.escrowId?.trim()) {
      return NextResponse.json({ error: "escrowId required" }, { status: 400 });
    }

    const result = await releaseP2pEscrow({
      escrowId: body.escrowId.trim(),
      actorStudentId: session.sub,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, escrowId: result.escrowId, message: result.message });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/dex/p2p/escrow/release" });
  }
}
