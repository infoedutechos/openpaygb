import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { createMerchantCharge, serializeMerchantCharge } from "@/lib/merchant-charge";
import { dispatchMerchantChargeWebhook } from "@/lib/merchant-charge-webhooks";

const CreateBody = z.object({
  amountUgx: z.number().int().positive(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().max(32).optional(),
  customerName: z.string().max(120).optional(),
  redirectUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  externalRef: z.string().max(120).optional(),
});

async function resolveDeveloperAppId(keyId: string): Promise<string | null> {
  const key = await prisma.partnerApiKey.findUnique({
    where: { id: keyId },
    select: { developerAppId: true, organizationId: true },
  });
  return key?.developerAppId ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePartnerAuth(req, "charges:read");
    if (!gate.ok) return gate.response;

    const developerAppId = await resolveDeveloperAppId(gate.partner.keyId);
    if (!developerAppId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 50);
    const rows = await prisma.merchantCharge.findMany({
      where: { developerAppId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      charges: rows.map((r) => serializeMerchantCharge(r, { includePrivate: true })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/charges" });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requirePartnerAuth(req, "charges:create");
    if (!gate.ok) return gate.response;

    const key = await prisma.partnerApiKey.findUnique({
      where: { id: gate.partner.keyId },
      select: { developerAppId: true, organizationId: true },
    });
    if (!key?.developerAppId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const charge = await createMerchantCharge({
      developerAppId: key.developerAppId,
      apiKeyId: gate.partner.keyId,
      organizationId: key.organizationId,
      amountUgx: parsed.data.amountUgx,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      customerName: parsed.data.customerName,
      redirectUrl: parsed.data.redirectUrl,
      cancelUrl: parsed.data.cancelUrl,
      externalRef: parsed.data.externalRef,
    });

    const serialized = serializeMerchantCharge(charge, { includePrivate: true });
    void dispatchMerchantChargeWebhook("charge.created", serialized, key.developerAppId).catch(() => undefined);

    return NextResponse.json({ charge: serialized }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/partner/v1/charges" });
  }
}
