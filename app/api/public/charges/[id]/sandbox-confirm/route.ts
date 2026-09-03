import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { confirmMerchantChargeSandbox } from "@/lib/merchant-charge-momo";
import { isValidObjectId } from "@/lib/object-id";

/** Dev/sandbox only — confirms a charge without LivePay when sandbox mode is on. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid charge id" }, { status: 400 });
    }
    const result = await confirmMerchantChargeSandbox(id);
    return NextResponse.json(result);
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/charges/[id]/sandbox-confirm" });
  }
}
