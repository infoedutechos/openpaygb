import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { savePaymentProviderPolicy } from "@/lib/payment-provider-policy";
import { getMasterPaymentProviderRows } from "@/lib/payment-providers-status";
import { PAYMENT_PROVIDER_CODES } from "@/lib/payment-providers-catalog";

const PatchBody = z.object({
  toggles: z.record(z.string(), z.boolean()).optional(),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const data = await getMasterPaymentProviderRows();
  const custom = await prisma.mobileMoneyProvider.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: { select: { slug: true } } },
    take: 50,
  });

  return NextResponse.json({
    ...data,
    customProviders: custom.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      paymentRail: p.paymentRail,
      webhookPath: data.appUrl
        ? `${data.appUrl}/api/webhooks/provider/${p.code}`
        : `/api/webhooks/provider/${p.code}`,
      organizationSlug: p.organization?.slug ?? null,
      activeForPayments: p.status === "active",
    })),
  });
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const toggles = parsed.data.toggles ?? {};
  const filtered: Record<string, boolean> = {};
  for (const code of PAYMENT_PROVIDER_CODES) {
    if (Object.prototype.hasOwnProperty.call(toggles, code)) {
      filtered[code] = toggles[code] === true;
    }
  }

  await savePaymentProviderPolicy(filtered);

  if (Object.prototype.hasOwnProperty.call(filtered, "openpay_card")) {
    await prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: {
        key: PLATFORM_SITE_UI_KEY,
        openPayCardEnabled: filtered.openpay_card === true,
      },
      update: {
        openPayCardEnabled: filtered.openpay_card === true,
      },
    });
  }

  const data = await getMasterPaymentProviderRows();
  return NextResponse.json(data);
}
