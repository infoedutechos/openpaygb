import { NextRequest, NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { acceptP2pEscrow } from "@/lib/dex-p2p-escrow";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in to use P2P escrow" }, { status: 401 });
    }

    const body = (await req.json()) as { offerId?: string };
    if (!body.offerId?.trim()) {
      return NextResponse.json({ error: "offerId is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await acceptP2pEscrow({
      offerId: body.offerId.trim(),
      takerStudentId: session.sub,
      organizationId: student.organizationId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      escrowId: result.escrowId,
      referenceKey: result.referenceKey,
      message: result.message,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/dex/p2p/escrow" });
  }
}
