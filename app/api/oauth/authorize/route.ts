import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isValidRedirectUri } from "@/lib/developer-app";
import { readDeveloperSessionFromCookies } from "@/lib/developer-session";

const CODE_TTL_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const clientId = url.searchParams.get("client_id")?.trim();
  const redirectUri = url.searchParams.get("redirect_uri")?.trim();
  const responseType = url.searchParams.get("response_type")?.trim();
  const scope = url.searchParams.get("scope")?.trim() ?? "";
  const state = url.searchParams.get("state")?.trim() ?? "";

  if (responseType !== "code") {
    return NextResponse.json({ error: "unsupported_response_type" }, { status: 400 });
  }
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const app = await prisma.developerApp.findUnique({ where: { clientId } });
  if (!app || !app.enabled) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  if (!app.redirectUris.includes(redirectUri) || !isValidRedirectUri(redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const session = await readDeveloperSessionFromCookies();
  if (!session || session.appId !== app.id) {
    const login = new URL("/developers/dashboard", req.url);
    login.searchParams.set("oauth", "1");
    login.searchParams.set("client_id", clientId);
    login.searchParams.set("redirect_uri", redirectUri);
    login.searchParams.set("scope", scope);
    login.searchParams.set("state", state);
    return NextResponse.redirect(login);
  }

  const requestedScopes = scope
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const scopes =
    requestedScopes.length > 0
      ? requestedScopes.filter((s) => app.scopes.includes(s))
      : [...app.scopes];

  const code = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.oAuthAuthorizationCode.create({
    data: {
      developerAppId: app.id,
      code,
      redirectUri,
      scopes,
      state,
      expiresAt,
    },
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target);
}
