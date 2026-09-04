import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { ensureSchoolMerchantApp } from "@/lib/school-merchant-app";
import {
  getMerchantSettlementSummary,
  serializeMerchantCharge,
} from "@/lib/merchant-charge";
import {
  requestMerchantPayout,
  serializeMerchantPayout,
} from "@/lib/merchant-payout";
import { developerAppPublicView } from "@/lib/developer-app";

function orgSlug(req: NextRequest) {
  return req.nextUrl.searchParams.get("organizationSlug");
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const { app, created } = await ensureSchoolMerchantApp(gate.scope.organizationId);
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "40"), 100);

    const [summary, charges, payouts] = await Promise.all([
      getMerchantSettlementSummary(app.id),
      prisma.merchantCharge.findMany({
        where: { developerAppId: app.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.merchantPayout.findMany({
        where: { developerAppId: app.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return NextResponse.json({
      provisioned: created,
      app: developerAppPublicView(app),
      settlement: summary,
      charges: charges.map((c) => serializeMerchantCharge(c)),
      payouts: payouts.map(serializeMerchantPayout),
      hint: {
        createCharge: "POST /api/partner/v1/charges (use a Partner API key from Developers dashboard)",
        developersDashboard: "/developers/dashboard#settlement",
        masterCashouts: "/admin/master/opgb-ops",
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/settlement" });
  }
}

const PatchBody = z.object({
  payoutPhone: z.string().max(32).optional(),
  payoutNetwork: z.enum(["MTN", "AIRTEL", ""]).optional(),
  brandingName: z.string().max(120).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const { app } = await ensureSchoolMerchantApp(gate.scope.organizationId);
    const d = parsed.data;
    const updated = await prisma.developerApp.update({
      where: { id: app.id },
      data: {
        ...(d.payoutPhone !== undefined ? { payoutPhone: d.payoutPhone.trim() } : {}),
        ...(d.payoutNetwork !== undefined ? { payoutNetwork: d.payoutNetwork } : {}),
        ...(d.brandingName !== undefined ? { brandingName: d.brandingName.trim() } : {}),
      },
    });

    const summary = await getMerchantSettlementSummary(updated.id);
    return NextResponse.json({
      app: developerAppPublicView(updated),
      settlement: summary,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/settlement" });
  }
}

const PostBody = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cashout"),
    amountUgx: z.number().int().positive(),
    phone: z.string().max(32).optional(),
    network: z.enum(["MTN", "AIRTEL"]).optional(),
    note: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("create_charge"),
    amountUgx: z.number().int().positive().default(5000),
    description: z.string().max(200).optional(),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const json = await req.json().catch(() => null);
    // Backward compatible: bare cashout body without action
    const normalized =
      json && typeof json === "object" && !("action" in json)
        ? { action: "cashout" as const, ...(json as object) }
        : json;
    const parsed = PostBody.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const { app } = await ensureSchoolMerchantApp(gate.scope.organizationId);

    if (parsed.data.action === "create_charge") {
      const { createMerchantCharge, serializeMerchantCharge } = await import("@/lib/merchant-charge");
      const { dispatchMerchantChargeWebhook } = await import("@/lib/merchant-charge-webhooks");
      const charge = await createMerchantCharge({
        developerAppId: app.id,
        organizationId: gate.scope.organizationId,
        amountUgx: parsed.data.amountUgx,
        description: parsed.data.description || "School test charge",
        externalRef: `school-test-${Date.now()}`,
      });
      const serialized = serializeMerchantCharge(charge);
      void dispatchMerchantChargeWebhook("charge.created", serialized as unknown as Record<string, unknown>, app.id);
      return NextResponse.json({ charge: serialized }, { status: 201 });
    }

    const payout = await requestMerchantPayout({
      developerAppId: app.id,
      amountUgx: parsed.data.amountUgx,
      phone: parsed.data.phone,
      network: parsed.data.network,
      note: parsed.data.note,
    });
    const summary = await getMerchantSettlementSummary(app.id);

    return NextResponse.json(
      { payout: serializeMerchantPayout(payout), settlement: summary },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/settlement" });
  }
}
