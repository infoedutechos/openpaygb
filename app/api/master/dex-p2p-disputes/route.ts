import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { resolveP2pDispute } from "@/lib/dex-p2p-release";

const resolveSchema = z.object({
  disputeId: z.string().min(1),
  resolution: z.enum(["release", "refund"]),
  note: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const disputes = await prisma.dexP2pDispute.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        escrow: {
          include: {
            offer: {
              select: {
                id: true,
                side: true,
                asset: true,
                amount: true,
                priceUgxPerUnit: true,
                makerStudentId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      disputes: disputes.map((d) => ({
        id: d.id,
        status: d.status,
        reason: d.reason,
        escalatedBy: d.escalatedBy,
        createdAt: d.createdAt.toISOString(),
        escrow: {
          id: d.escrow.id,
          status: d.escrow.status,
          amountUgx: d.escrow.amountUgx,
          takerStudentId: d.escrow.takerStudentId,
          referenceKey: d.escrow.referenceKey,
          offer: d.escrow.offer,
        },
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/dex-p2p-disputes",
      fallback: "Could not load disputes",
    });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const body = resolveSchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    const result = await resolveP2pDispute(body.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (e) {
    return apiErrorResponse(e, {
      route: "POST /api/master/dex-p2p-disputes",
      fallback: "Could not resolve dispute",
    });
  }
}
