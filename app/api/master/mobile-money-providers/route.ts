import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { getBuiltinMobileMoneyProviders } from "@/lib/builtin-mobile-money";

const CreateBody = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  paymentRail: z.nativeEnum(PaymentRail).optional(),
  authKind: z.enum(["shared_secret_header", "hmac_sha256_body"]).optional(),
  webhookSecret: z.string().min(8).max(256).optional(),
  webhookHeaderName: z.string().max(80).optional(),
  orderIdFields: z.array(z.string().min(1)).max(20).optional(),
  statusField: z.string().max(80).optional(),
  statusSuccessValues: z.array(z.string().min(1)).max(30).optional(),
  transactionIdField: z.string().max(80).optional(),
  organizationId: z.string().optional().nullable(),
  notes: z.string().max(500).optional(),
  activate: z.boolean().optional(),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  try {
  const { warmDeploymentEnvCache } = await import("@/lib/deployment-env-resolve");
  await warmDeploymentEnvCache();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const custom = await withPrismaRetry(() =>
    prisma.mobileMoneyProvider.findMany({
      orderBy: { createdAt: "desc" },
      include: { organization: { select: { slug: true, name: true } } },
    }),
  );

  return NextResponse.json({
    builtin: getBuiltinMobileMoneyProviders(),
    credentialsAnchor: "/admin/master#ug-momo-credentials",
    custom: custom.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      paymentRail: p.paymentRail,
      authKind: p.authKind,
      webhookPath: appUrl ? `${appUrl}/api/webhooks/provider/${p.code}` : `/api/webhooks/provider/${p.code}`,
      webhookHeaderName: p.webhookHeaderName,
      orderIdFields: p.orderIdFields,
      statusField: p.statusField,
      statusSuccessValues: p.statusSuccessValues,
      transactionIdField: p.transactionIdField,
      organizationId: p.organizationId,
      organizationSlug: p.organization?.slug ?? null,
      hasSecret: Boolean(p.webhookSecret),
      notes: p.notes,
      createdAt: p.createdAt,
    })),
    paymentRails: ["telegram", "web", "momo_bridge", "mbiyo", "livepay"],
  });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/mobile-money-providers",
      fallback: "Could not load mobile money providers",
    });
  }
}

export async function POST(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const code = parsed.data.code.trim().toLowerCase();
  if (["momo", "mbiyo", "telegram"].includes(code)) {
    return NextResponse.json({ error: "Reserved provider code — use built-in MoMo/Mbiyo env config" }, { status: 400 });
  }

  const existing = await prisma.mobileMoneyProvider.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "Provider code already exists" }, { status: 409 });
  }

  if (parsed.data.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
    if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 400 });
  }

  const secret = parsed.data.webhookSecret?.trim() || randomBytes(24).toString("base64url");

  const row = await prisma.mobileMoneyProvider.create({
    data: {
      code,
      name: parsed.data.name.trim(),
      status: parsed.data.activate ? "active" : "disabled",
      paymentRail: parsed.data.paymentRail ?? "momo_bridge",
      authKind: parsed.data.authKind ?? "shared_secret_header",
      webhookSecret: secret,
      webhookHeaderName: parsed.data.webhookHeaderName?.trim() || "x-provider-webhook-secret",
      orderIdFields: parsed.data.orderIdFields ?? ["order_id", "paymentId", "payment_id"],
      statusField: parsed.data.statusField?.trim() || "status",
      statusSuccessValues: parsed.data.statusSuccessValues ?? ["successful", "SUCCESS", "success"],
      transactionIdField: parsed.data.transactionIdField?.trim() || "transaction_id",
      organizationId: parsed.data.organizationId ?? null,
      notes: parsed.data.notes?.trim() ?? "",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

  return NextResponse.json(
    {
      provider: {
        id: row.id,
        code: row.code,
        name: row.name,
        status: row.status,
        webhookPath: appUrl ? `${appUrl}/api/webhooks/provider/${row.code}` : `/api/webhooks/provider/${row.code}`,
      },
      webhookSecret: secret,
      warning: "Give this secret to the PSP and register the webhook URL. Secret is shown once.",
    },
    { status: 201 },
  );
}
