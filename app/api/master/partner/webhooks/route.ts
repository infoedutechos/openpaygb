import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

const EVENTS = ["payment.confirmed", "payment.failed"] as const;

const CreateBody = z.object({
  name: z.string().min(2).max(120),
  url: z.string().url(),
  organizationId: z.string().optional().nullable(),
  events: z.array(z.enum(EVENTS)).min(1),
  secret: z.string().min(16).max(256).optional(),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  try {
  const rows = await prisma.partnerWebhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { slug: true, name: true } },
    },
  });

  const deliveries = await prisma.partnerWebhookDelivery.groupBy({
    by: ["endpointId"],
    _count: { _all: true },
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });
  const deliveryMap = new Map(deliveries.map((d) => [d.endpointId, d._count._all]));

  return NextResponse.json({
    endpoints: rows.map((e) => ({
      id: e.id,
      name: e.name,
      url: e.url,
      organizationId: e.organizationId,
      organizationSlug: e.organization?.slug ?? null,
      events: e.events,
      enabled: e.enabled,
      secretHint: e.secret ? `${e.secret.slice(0, 4)}…` : "",
      deliveriesLast7d: deliveryMap.get(e.id) ?? 0,
      createdAt: e.createdAt,
    })),
    availableEvents: EVENTS,
  });
  } catch (e) {
    console.error("[master/partner/webhooks GET]", e);
    return NextResponse.json({ error: "Could not load webhook endpoints" }, { status: 500 });
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

  if (parsed.data.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
    if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 400 });
  }

  const secret = parsed.data.secret?.trim() || randomBytes(24).toString("base64url");

  const row = await prisma.partnerWebhookEndpoint.create({
    data: {
      name: parsed.data.name.trim(),
      url: parsed.data.url.trim(),
      secret,
      organizationId: parsed.data.organizationId ?? null,
      events: parsed.data.events,
    },
  });

  return NextResponse.json(
    {
      endpoint: {
        id: row.id,
        name: row.name,
        url: row.url,
        events: row.events,
      },
      signingSecret: secret,
      warning: "Use this secret to verify X-Odelhub-Signature (HMAC-SHA256 of raw body).",
    },
    { status: 201 },
  );
}
