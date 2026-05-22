import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { paymentToPartnerPayload } from "@/lib/mobile-money-provider-webhook";
import { isValidObjectId } from "@/lib/object-id";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const gate = await requirePartnerAuth(req, "payments:read");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { organization: { select: { slug: true, name: true } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (gate.partner.organizationId && payment.organizationId !== gate.partner.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ payment: paymentToPartnerPayload(payment) });
}
