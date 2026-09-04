import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOpenPayHolder } from "@/lib/admin-openpay-api";
import { cashoutOpenPayCardToMomo } from "@/lib/openpay-card-cashout";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  amountUgx: z.number().int().min(1000).max(500_000_000),
  phone: z.string().min(9).max(20),
  network: z.enum(["MTN", "AIRTEL"]).optional(),
  memo: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`admin-opcard-cashout:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const gate = await requireAdminOpenPayHolder(req);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await cashoutOpenPayCardToMomo({
      studentId: gate.holder.studentId,
      organizationId: gate.holder.organizationId,
      amountUgx: parsed.data.amountUgx,
      phone: parsed.data.phone,
      network: parsed.data.network,
      memo: parsed.data.memo,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      ok: true,
      requestId: result.requestId,
      referenceKey: result.referenceKey,
      message: result.message,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/openpay-card/cashout-momo" });
  }
}
