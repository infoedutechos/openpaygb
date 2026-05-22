import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { generatePartnerApiKey, PARTNER_SCOPES } from "@/lib/partner-api-key";

const CreateBody = z.object({
  name: z.string().min(2).max(120),
  organizationId: z.string().optional().nullable(),
  scopes: z.array(z.enum(PARTNER_SCOPES)).min(1),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  try {
  const rows = await prisma.partnerApiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: { select: { slug: true, name: true } } },
  });

  return NextResponse.json({
    keys: rows.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      organizationId: k.organizationId,
      organizationSlug: k.organization?.slug ?? null,
      scopes: k.scopes,
      enabled: k.enabled,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
    availableScopes: PARTNER_SCOPES,
  });
  } catch (e) {
    console.error("[master/partner/keys GET]", e);
    return NextResponse.json({ error: "Could not load API keys" }, { status: 500 });
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

  const { plain, prefix, hash } = generatePartnerApiKey();

  const row = await prisma.partnerApiKey.create({
    data: {
      name: parsed.data.name.trim(),
      keyPrefix: prefix,
      keyHash: hash,
      organizationId: parsed.data.organizationId ?? null,
      scopes: parsed.data.scopes,
    },
  });

  return NextResponse.json(
    {
      key: {
        id: row.id,
        name: row.name,
        keyPrefix: row.keyPrefix,
        scopes: row.scopes,
      },
      apiKey: plain,
      warning: "Copy the API key now — it cannot be shown again.",
    },
    { status: 201 },
  );
}
