import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { verifyDeveloperClientCredentials } from "@/lib/developer-auth";
import { generatePartnerApiKey } from "@/lib/partner-api-key";

function parseTokenBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return req.json().then((j) =>
      Object.fromEntries(
        Object.entries(j ?? {}).map(([k, v]) => [k, typeof v === "string" ? v : String(v)]),
      ),
    );
  }
  return req.text().then((text) => {
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  });
}

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`oauth-token:${clientIp(req)}`, 60, 60_000)) {
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    const body = await parseTokenBody(req);
    const grantType = body.grant_type?.trim();
    const clientId = body.client_id?.trim();
    const clientSecret = body.client_secret?.trim();

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }

    const verified = await verifyDeveloperClientCredentials(clientId, clientSecret);
    if (!verified.ok) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }

    const app = await prisma.developerApp.findUnique({ where: { id: verified.appId } });
    if (!app) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }

    if (grantType === "client_credentials") {
      const { plain, prefix, hash } = generatePartnerApiKey();
      await prisma.partnerApiKey.create({
        data: {
          name: `OAuth M2M ${new Date().toISOString().slice(0, 10)}`,
          keyPrefix: prefix,
          keyHash: hash,
          developerAppId: app.id,
          organizationId: app.organizationId,
          scopes: app.scopes,
        },
      });
      return NextResponse.json({
        access_token: plain,
        token_type: "Bearer",
        expires_in: 3600,
        scope: app.scopes.join(" "),
      });
    }

    if (grantType === "authorization_code") {
      const code = body.code?.trim();
      const redirectUri = body.redirect_uri?.trim();
      if (!code || !redirectUri) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }

      const row = await prisma.oAuthAuthorizationCode.findUnique({ where: { code } });
      if (
        !row ||
        row.developerAppId !== app.id ||
        row.redirectUri !== redirectUri ||
        row.usedAt ||
        row.expiresAt < new Date()
      ) {
        return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
      }

      await prisma.oAuthAuthorizationCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });

      const { plain, prefix, hash } = generatePartnerApiKey();
      await prisma.partnerApiKey.create({
        data: {
          name: `OAuth code ${createHash("sha256").update(code).digest("hex").slice(0, 8)}`,
          keyPrefix: prefix,
          keyHash: hash,
          developerAppId: app.id,
          organizationId: app.organizationId,
          scopes: row.scopes.length > 0 ? row.scopes : app.scopes,
        },
      });

      return NextResponse.json({
        access_token: plain,
        token_type: "Bearer",
        expires_in: 3600,
        scope: (row.scopes.length > 0 ? row.scopes : app.scopes).join(" "),
      });
    }

    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/oauth/token" });
  }
}
