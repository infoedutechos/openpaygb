import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";

/** Public payment status for UX polling (no auth). Use payment `id` from the checkout response. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const p = await prisma.payment.findUnique({
    where: { id },
    select: {
      status: true,
      txHash: true,
      confirmedAt: true,
      tonAmount: true,
      memo: true,
    },
  });

  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    payment: {
      id,
      status: p.status,
      txHash: p.txHash,
      confirmedAt: p.confirmedAt,
      tonAmount: p.tonAmount,
      memo: p.memo,
    },
  });
}
