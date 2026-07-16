import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import {
  completeOpgbWithdraw,
  failOpgbWithdraw,
} from "@/lib/opgb-withdraw";

const actionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["complete", "reject"]),
  note: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.trim();

    const withdraws = await prisma.opgbWithdrawRequest.findMany({
      where: status
        ? { status }
        : { status: { in: ["pending", "processing"] } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({
      withdraws: withdraws.map((w) => ({
        id: w.id,
        studentId: w.studentId,
        organizationId: w.organizationId,
        asset: w.asset,
        amount: w.amount,
        amountUgx: w.amountUgx,
        rail: w.rail,
        destination: w.destination,
        status: w.status,
        referenceKey: w.referenceKey,
        memo: w.memo,
        createdAt: w.createdAt.toISOString(),
        completedAt: w.completedAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/opgb-withdraws",
      fallback: "Could not load withdraw queue",
    });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const body = actionSchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    const result =
      body.data.action === "complete"
        ? await completeOpgbWithdraw({ requestId: body.data.requestId, note: body.data.note })
        : await failOpgbWithdraw({ requestId: body.data.requestId, note: body.data.note });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (e) {
    return apiErrorResponse(e, {
      route: "POST /api/master/opgb-withdraws",
      fallback: "Could not update withdraw",
    });
  }
}
