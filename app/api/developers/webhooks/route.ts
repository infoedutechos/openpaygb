import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";
import { PARTNER_WEBHOOK_EVENTS } from "@/lib/developer-app";

const CreateBody = z.object({
  name: z.string().min(2).max(120),
  url: z.string().url(),
  events: z.array(z.enum(PARTNER_WEBHOOK_EVENTS)).min(1),
  secret: z.string().min(16).max(256).optional(),
});

export async function GET() {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const rows = await prisma.partnerWebhookEndpoint.findMany({
      where: { developerAppId: gate.app.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      endpoints: rows.map((e) => ({
        id: e.id,
        name: e.name,
        url: e.url,
        events: e.events,
        enabled: e.enabled,
        secretHint: e.secret ? `${e.secret.slice(0, 4)}…` : "",
        createdAt: e.createdAt,
      })),
      availableEvents: PARTNER_WEBHOOK_EVENTS,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/developers/webhooks" });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const secret = parsed.data.secret?.trim() || randomBytes(24).toString("base64url");

    const row = await prisma.partnerWebhookEndpoint.create({
      data: {
        name: parsed.data.name.trim(),
        url: parsed.data.url.trim(),
        secret,
        events: parsed.data.events,
        developerAppId: gate.app.id,
        organizationId: gate.app.organizationId,
      },
    });

    return NextResponse.json(
      {
        endpoint: { id: row.id, name: row.name, url: row.url, events: row.events },
        signingSecret: secret,
        warning: "Verify payloads with X-Odelhub-Signature (HMAC-SHA256 of raw body).",
      },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/developers/webhooks" });
  }
}
