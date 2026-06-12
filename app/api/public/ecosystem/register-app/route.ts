import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import {
  DEVELOPER_DEFAULT_SCOPES,
  developerAppPublicView,
  generateDeveloperCredentials,
  isValidRedirectUri,
  slugifyDeveloperAppName,
} from "@/lib/developer-app";

const RegisterBody = z.object({
  name: z.string().min(2).max(120),
  contactEmail: z.string().email().max(200),
  redirectUris: z.array(z.string().max(2000)).max(10).optional().default([]),
  brandingName: z.string().max(120).optional(),
  brandingLogoUrl: z.string().url().max(2000).optional().or(z.literal("")),
  organizationSlug: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`register-app:${clientIp(req)}`, 8, 60 * 60_000)) {
      return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = RegisterBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const redirectUris = parsed.data.redirectUris.filter(isValidRedirectUri);
    if (parsed.data.redirectUris.length > 0 && redirectUris.length === 0) {
      return NextResponse.json(
        { error: "redirectUris must use https:// or http://localhost" },
        { status: 400 },
      );
    }

    let organizationId: string | null = null;
    if (parsed.data.organizationSlug?.trim()) {
      const org = await prisma.organization.findFirst({
        where: { slug: parsed.data.organizationSlug.trim(), tenantStatus: "active" },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json({ error: "Unknown active organization slug" }, { status: 400 });
      }
      organizationId = org.id;
    }

    const { clientId, clientSecret, clientSecretHash } = generateDeveloperCredentials();
    const slug = slugifyDeveloperAppName(parsed.data.name);

    const row = await prisma.developerApp.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
        clientId,
        clientSecretHash,
        redirectUris,
        brandingName: parsed.data.brandingName?.trim() || parsed.data.name.trim(),
        brandingLogoUrl: parsed.data.brandingLogoUrl?.trim() || "",
        scopes: [...DEVELOPER_DEFAULT_SCOPES],
        organizationId,
      },
    });

    return NextResponse.json(
      {
        app: developerAppPublicView(row),
        clientId,
        clientSecret,
        dashboardUrl: "/developers/dashboard",
        docsUrl: "/help?hub=dex",
        warning: "Copy clientSecret now — it cannot be shown again. Use it to sign in at /developers/dashboard.",
      },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/ecosystem/register-app" });
  }
}
