import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

const EVENTS = ["payment.confirmed", "payment.failed"] as const;

type RouteCtx = { params: Promise<{ id: string }> };

const PatchBody = z.object({
  name: z.string().min(2).max(120).optional(),
  url: z.string().url().optional(),
  enabled: z.boolean().optional(),
  events: z.array(z.enum(EVENTS)).min(1).optional(),
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

  const row = await prisma.partnerWebhookEndpoint.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({
    endpoint: { id: row.id, name: row.name, url: row.url, enabled: row.enabled, events: row.events },
  });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await prisma.partnerWebhookEndpoint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
