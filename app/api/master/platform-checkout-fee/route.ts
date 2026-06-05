import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import {
  PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX,
  computePlatformFeeUgx,
  describeCheckoutFeeRule,
  getCheckoutPlatformFeeUgxFromEnv,
  getPlatformDefaultCheckoutFeeRule,
  isUnknownPlatformFeeFieldError,
  loadPlatformFeeSettingsRow,
  platformDefaultRuleFromRow,
  clampPercent,
  type CheckoutPlatformFeeKind,
} from "@/lib/checkout-platform-fee";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBody = z
  .object({
    checkoutPlatformFeeDefaultKind: z.enum(["env", "fixed_ugx", "percent"]).optional(),
    checkoutPlatformFeeDefaultUgx: z.number().int().min(-1).max(1_000_000_000).optional(),
    checkoutPlatformFeeDefaultPercent: z.number().min(0).max(100).optional(),
  })
  .superRefine((val, ctx) => {
    const kind = val.checkoutPlatformFeeDefaultKind;
    if (kind === "fixed_ugx" && (val.checkoutPlatformFeeDefaultUgx == null || val.checkoutPlatformFeeDefaultUgx < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fixed_ugx requires checkoutPlatformFeeDefaultUgx ≥ 0",
        path: ["checkoutPlatformFeeDefaultUgx"],
      });
    }
    if (kind === "percent" && val.checkoutPlatformFeeDefaultPercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "percent requires checkoutPlatformFeeDefaultPercent",
        path: ["checkoutPlatformFeeDefaultPercent"],
      });
    }
  });

function feePayload(row: Parameters<typeof platformDefaultRuleFromRow>[0]) {
  const rule = platformDefaultRuleFromRow(row);
  const envFallbackUgx = getCheckoutPlatformFeeUgxFromEnv();
  const effectiveDefaultUgx = computePlatformFeeUgx(PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX, rule);
  const kind =
    (row?.checkoutPlatformFeeDefaultKind?.trim() as CheckoutPlatformFeeKind | undefined) ??
    (rule.kind === "percent" ? "percent" : rule.kind === "fixed_ugx" ? "fixed_ugx" : "env");
  return {
    checkoutPlatformFeeDefaultKind: kind,
    checkoutPlatformFeeDefaultUgx: row?.checkoutPlatformFeeDefaultUgx ?? -1,
    checkoutPlatformFeeDefaultPercent:
      row?.checkoutPlatformFeeDefaultPercent ?? (rule.kind === "percent" ? rule.percent : 0),
    ruleDescription: describeCheckoutFeeRule(rule),
    previewSubtotalUgx: PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX,
    envFallbackUgx,
    effectiveDefaultUgx,
  };
}

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const row = await loadPlatformFeeSettingsRow();

    if (!row) {
      const rule = await getPlatformDefaultCheckoutFeeRule();
      return NextResponse.json({
        checkoutPlatformFeeDefaultKind: "env" as const,
        checkoutPlatformFeeDefaultUgx: -1,
        checkoutPlatformFeeDefaultPercent: 0,
        ruleDescription: describeCheckoutFeeRule(rule),
        previewSubtotalUgx: PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX,
        envFallbackUgx: getCheckoutPlatformFeeUgxFromEnv(),
        effectiveDefaultUgx: computePlatformFeeUgx(PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX, rule),
      });
    }

    return NextResponse.json(feePayload(row));
  } catch (e) {
    return apiErrorResponse(e, { route: "master/platform-checkout-fee GET", fallback: "Could not load fee settings" });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const kind = parsed.data.checkoutPlatformFeeDefaultKind ?? "env";
    const ugx =
      kind === "fixed_ugx"
        ? Math.max(0, Math.round(parsed.data.checkoutPlatformFeeDefaultUgx ?? 0))
        : -1;
    const percent =
      kind === "percent" ? clampPercent(parsed.data.checkoutPlatformFeeDefaultPercent ?? 0) : 0;

    let updated: {
      checkoutPlatformFeeDefaultKind: string;
      checkoutPlatformFeeDefaultUgx: number;
      checkoutPlatformFeeDefaultPercent: number;
    };
    try {
      updated = await prisma.siteUiSettings.upsert({
        where: { key: "platform" },
        create: {
          key: "platform",
          checkoutPlatformFeeDefaultKind: kind,
          checkoutPlatformFeeDefaultUgx: ugx,
          checkoutPlatformFeeDefaultPercent: percent,
        },
        update: {
          checkoutPlatformFeeDefaultKind: kind,
          checkoutPlatformFeeDefaultUgx: ugx,
          checkoutPlatformFeeDefaultPercent: percent,
        },
        select: {
          checkoutPlatformFeeDefaultKind: true,
          checkoutPlatformFeeDefaultUgx: true,
          checkoutPlatformFeeDefaultPercent: true,
        },
      });
    } catch (e) {
      if (!isUnknownPlatformFeeFieldError(e) || kind === "percent") {
        return NextResponse.json(
          {
            error:
              "Prisma client is out of date. Stop the dev server, run `npx prisma generate`, then restart.",
          },
          { status: 503 },
        );
      }
      const legacy = await prisma.siteUiSettings.upsert({
        where: { key: "platform" },
        create: { key: "platform", checkoutPlatformFeeDefaultUgx: ugx },
        update: { checkoutPlatformFeeDefaultUgx: ugx },
        select: { checkoutPlatformFeeDefaultUgx: true },
      });
      updated = {
        checkoutPlatformFeeDefaultKind: kind,
        checkoutPlatformFeeDefaultUgx: legacy.checkoutPlatformFeeDefaultUgx,
        checkoutPlatformFeeDefaultPercent: 0,
      };
    }

    return NextResponse.json(feePayload(updated));
  } catch (e) {
    return apiErrorResponse(e, { route: "master/platform-checkout-fee PATCH", fallback: "Could not save fee settings" });
  }
}
