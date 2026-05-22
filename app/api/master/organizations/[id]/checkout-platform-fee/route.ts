import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

const Body = z.object({
  checkoutPlatformFeeUgx: z.number().int().min(-1).max(1_000_000_000),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: { checkoutPlatformFeeUgx: parsed.data.checkoutPlatformFeeUgx },
    select: {
      id: true,
      slug: true,
      name: true,
      checkoutPlatformFeeUgx: true,
    },
  });

  return NextResponse.json({ organization: updated });
}
