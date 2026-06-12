import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";

const PatchBody = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(2).max(120).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const existing = await prisma.partnerWebhookEndpoint.findFirst({
      where: { id, developerAppId: gate.app.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const row = await prisma.partnerWebhookEndpoint.update({
      where: { id },
      data: {
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      },
    });

    return NextResponse.json({
      endpoint: { id: row.id, name: row.name, url: row.url, events: row.events, enabled: row.enabled },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/developers/webhooks/[id]" });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const existing = await prisma.partnerWebhookEndpoint.findFirst({
      where: { id, developerAppId: gate.app.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await prisma.partnerWebhookEndpoint.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/developers/webhooks/[id]" });
  }
}
