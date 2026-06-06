import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { listPendingKnowledgeGaps } from "@/lib/knowledge-base/continuous-learning";

const PatchBody = z.object({
  id: z.string().min(1),
  status: z.enum(["dismissed", "promoted"]),
  promotedSlug: z.string().optional(),
});

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const gaps = await listPendingKnowledgeGaps(50);
    return NextResponse.json({
      total: gaps.length,
      gaps: gaps.map((g) => ({
        id: g.id,
        querySample: g.querySample,
        hub: g.hub,
        hitCount: g.hitCount,
        status: g.status,
        firstSeenAt: g.firstSeenAt.toISOString(),
        lastSeenAt: g.lastSeenAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/knowledge/gaps" });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    await prisma.knowledgeLearningGap.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        promotedSlug: parsed.data.promotedSlug ?? "",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/knowledge/gaps" });
  }
}
