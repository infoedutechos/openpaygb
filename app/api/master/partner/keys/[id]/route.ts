import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { PARTNER_SCOPES } from "@/lib/partner-api-key";

type RouteCtx = { params: Promise<{ id: string }> };

const PatchBody = z.object({
  name: z.string().min(2).max(120).optional(),
  enabled: z.boolean().optional(),
  scopes: z.array(z.enum(PARTNER_SCOPES)).min(1).optional(),
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

  const row = await prisma.partnerApiKey.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ key: { id: row.id, name: row.name, enabled: row.enabled, scopes: row.scopes } });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await prisma.partnerApiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
