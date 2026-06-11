import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const escrows = await prisma.dexP2pEscrow.findMany({
      where: { takerStudentId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        offer: { select: { asset: true, amount: true, side: true, makerStudentId: true } },
        dispute: { select: { id: true, status: true, reason: true } },
      },
    });

    const asMaker = await prisma.dexP2pOffer.findMany({
      where: { makerStudentId: session.sub, status: "matched" },
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

    return NextResponse.json({ escrows, makerOffers: asMaker });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/student/dex/p2p/escrows" });
  }
}
