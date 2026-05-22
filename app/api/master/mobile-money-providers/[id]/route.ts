import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

type RouteCtx = { params: Promise<{ id: string }> };

const PatchBody = z.object({
  name: z.string().min(2).max(120).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  paymentRail: z.nativeEnum(PaymentRail).optional(),
  authKind: z.enum(["shared_secret_header", "hmac_sha256_body"]).optional(),
  webhookSecret: z.string().min(8).max(256).optional(),
  webhookHeaderName: z.string().max(80).optional(),
  orderIdFields: z.array(z.string().min(1)).max(20).optional(),
  statusField: z.string().max(80).optional(),
  statusSuccessValues: z.array(z.string().min(1)).max(30).optional(),
  transactionIdField: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

export async function PATCH(req: Request, ctx: RouteCtx) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const row = await prisma.mobileMoneyProvider.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({
    provider: { id: row.id, code: row.code, name: row.name, status: row.status },
  });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await prisma.mobileMoneyProvider.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
