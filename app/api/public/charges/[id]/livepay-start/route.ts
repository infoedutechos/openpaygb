import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { startMerchantChargeLivePayCollect } from "@/lib/merchant-charge-momo";
import { isValidObjectId } from "@/lib/object-id";

const Body = z.object({
  phone: z.string().min(9).max(20),
  network: z.enum(["MTN", "AIRTEL"]).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid charge id" }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await startMerchantChargeLivePayCollect({
      chargeId: id,
      phone: parsed.data.phone,
      network: parsed.data.network,
    });

    return NextResponse.json(result);
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/charges/[id]/livepay-start" });
  }
}
