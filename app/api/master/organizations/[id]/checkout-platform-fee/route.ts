import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { clampPercent } from "@/lib/checkout-platform-fee";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z
  .object({
    checkoutPlatformFeeKind: z.enum(["inherit", "fixed_ugx", "percent"]).optional(),
    checkoutPlatformFeeUgx: z.number().int().min(-1).max(1_000_000_000).optional(),
    checkoutPlatformFeePercent: z.number().min(0).max(100).optional(),
  })
  .superRefine((val, ctx) => {
    const kind = val.checkoutPlatformFeeKind;
    if (kind === "fixed_ugx" && (val.checkoutPlatformFeeUgx == null || val.checkoutPlatformFeeUgx < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fixed_ugx requires checkoutPlatformFeeUgx ≥ 0",
        path: ["checkoutPlatformFeeUgx"],
      });
    }
    if (kind === "percent" && val.checkoutPlatformFeePercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "percent requires checkoutPlatformFeePercent",
        path: ["checkoutPlatformFeePercent"],
      });
    }
  });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
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

    let data: {
      checkoutPlatformFeeKind: string;
      checkoutPlatformFeeUgx: number;
      checkoutPlatformFeePercent: number;
    };

    if (parsed.data.checkoutPlatformFeeKind) {
      const kind = parsed.data.checkoutPlatformFeeKind;
      if (kind === "inherit") {
        data = { checkoutPlatformFeeKind: "inherit", checkoutPlatformFeeUgx: -1, checkoutPlatformFeePercent: 0 };
      } else if (kind === "fixed_ugx") {
        data = {
          checkoutPlatformFeeKind: "fixed_ugx",
          checkoutPlatformFeeUgx: Math.max(0, Math.round(parsed.data.checkoutPlatformFeeUgx ?? 0)),
          checkoutPlatformFeePercent: 0,
        };
      } else {
        data = {
          checkoutPlatformFeeKind: "percent",
          checkoutPlatformFeeUgx: -1,
          checkoutPlatformFeePercent: clampPercent(parsed.data.checkoutPlatformFeePercent ?? 0),
        };
      }
    } else {
      const n = parsed.data.checkoutPlatformFeeUgx ?? org.checkoutPlatformFeeUgx;
      data = {
        checkoutPlatformFeeKind: n < 0 ? "inherit" : "fixed_ugx",
        checkoutPlatformFeeUgx: n,
        checkoutPlatformFeePercent: org.checkoutPlatformFeePercent ?? 0,
      };
    }

    const updated = await prisma.organization.update({
      where: { id },
      data,
      select: {
        id: true,
        slug: true,
        name: true,
        checkoutPlatformFeeKind: true,
        checkoutPlatformFeeUgx: true,
        checkoutPlatformFeePercent: true,
      },
    });

    return NextResponse.json({ organization: updated });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "master/organizations/checkout-platform-fee",
      fallback: "Could not update processing charge",
    });
  }
}
