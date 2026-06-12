import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";
import { generatePartnerApiKey, PARTNER_SCOPES } from "@/lib/partner-api-key";

const CreateBody = z.object({
  name: z.string().min(2).max(120),
  scopes: z.array(z.enum(PARTNER_SCOPES)).min(1),
});

export async function GET() {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const rows = await prisma.partnerApiKey.findMany({
      where: { developerAppId: gate.app.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      keys: rows.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        enabled: k.enabled,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
      availableScopes: PARTNER_SCOPES,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/developers/keys" });
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

    const allowed = new Set(gate.app.scopes);
    const invalid = parsed.data.scopes.filter((s) => !allowed.has(s));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Scopes exceed app allowance", invalid, appScopes: gate.app.scopes },
        { status: 400 },
      );
    }

    const { plain, prefix, hash } = generatePartnerApiKey();
    const row = await prisma.partnerApiKey.create({
      data: {
        name: parsed.data.name.trim(),
        keyPrefix: prefix,
        keyHash: hash,
        developerAppId: gate.app.id,
        organizationId: gate.app.organizationId,
        scopes: parsed.data.scopes,
      },
    });

    return NextResponse.json(
      {
        key: { id: row.id, name: row.name, keyPrefix: row.keyPrefix, scopes: row.scopes },
        apiKey: plain,
        warning: "Copy the API key now — it cannot be shown again.",
      },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/developers/keys" });
  }
}
