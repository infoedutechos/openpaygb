import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

const OrgFxPatch = z
  .object({
    fxOverrideKind: z.enum(["inherit", "none", "fixed", "buffer_pct"]),
    fxOverrideUgxPerTon: z.union([z.number().positive(), z.null()]).optional(),
    fxOverrideBufferPct: z.number().finite().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.fxOverrideKind === "fixed") {
      const u = val.fxOverrideUgxPerTon;
      if (u == null || u <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fxOverrideUgxPerTon"],
          message: "Required positive number when kind is fixed",
        });
      }
    }
    if (val.fxOverrideKind === "buffer_pct" && val.fxOverrideBufferPct === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fxOverrideBufferPct"],
        message: "Required when kind is buffer_pct",
      });
    }
  });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = OrgFxPatch.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const kind = parsed.data.fxOverrideKind;
  const data: {
    fxOverrideKind: string;
    fxOverrideUgxPerTon: number | null;
    fxOverrideBufferPct: number;
  } = {
    fxOverrideKind: kind,
    fxOverrideUgxPerTon: null,
    fxOverrideBufferPct: 0,
  };

  if (kind === "inherit" || kind === "none") {
    data.fxOverrideUgxPerTon = null;
    data.fxOverrideBufferPct = 0;
  } else if (kind === "fixed") {
    data.fxOverrideUgxPerTon = parsed.data.fxOverrideUgxPerTon!;
    data.fxOverrideBufferPct = parsed.data.fxOverrideBufferPct ?? 0;
  } else if (kind === "buffer_pct") {
    data.fxOverrideUgxPerTon = parsed.data.fxOverrideUgxPerTon ?? null;
    data.fxOverrideBufferPct = parsed.data.fxOverrideBufferPct!;
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      fxOverrideKind: data.fxOverrideKind,
      fxOverrideUgxPerTon: data.fxOverrideUgxPerTon,
      fxOverrideBufferPct: data.fxOverrideBufferPct,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      fxOverrideKind: true,
      fxOverrideUgxPerTon: true,
      fxOverrideBufferPct: true,
    },
  });

  return NextResponse.json({ organization: updated });
}
