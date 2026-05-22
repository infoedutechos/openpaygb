import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { isPlausibleTonAddress, normalizeTonAddress } from "@/lib/ton-address";

const Body = z.object({
  destinationWallet: z.string().max(128),
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

  const raw = normalizeTonAddress(parsed.data.destinationWallet);
  if (raw && !isPlausibleTonAddress(raw)) {
    return NextResponse.json(
      { error: "Invalid TON address. Use a user-friendly address (EQ… or UQ…)." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: { destinationWallet: raw },
    select: {
      id: true,
      slug: true,
      name: true,
      destinationWallet: true,
    },
  });

  return NextResponse.json({ organization: updated });
}
