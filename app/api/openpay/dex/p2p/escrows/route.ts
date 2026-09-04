import { NextResponse } from "next/server";
import { resolveOpenPayP2pActor } from "@/lib/openpay-p2p-actor";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const gate = await resolveOpenPayP2pActor(req);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const studentId = gate.actor.studentId;
    const escrows = await prisma.dexP2pEscrow.findMany({
      where: { takerStudentId: studentId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        offer: { select: { asset: true, amount: true, side: true, makerStudentId: true } },
        dispute: { select: { id: true, status: true, reason: true } },
      },
    });

    const asMaker = await prisma.dexP2pOffer.findMany({
      where: { makerStudentId: studentId, status: "matched" },
      select: {
        id: true,
        asset: true,
        amount: true,
        escrows: {
          include: { dispute: { select: { id: true, status: true } } },
        },
      },
      take: 25,
    });

    return NextResponse.json({
      actor: gate.actor.kind,
      escrows,
      makerOffers: asMaker,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/openpay/dex/p2p/escrows" });
  }
}
