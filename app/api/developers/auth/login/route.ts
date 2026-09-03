import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { verifyDeveloperClientCredentials } from "@/lib/developer-auth";
import { developerAppPublicView } from "@/lib/developer-app";
import { prisma } from "@/lib/prisma";
import {
  setDeveloperSessionCookie,
  signDeveloperSession,
} from "@/lib/developer-session";

const LoginBody = z.object({
  clientId: z.string().min(10).max(120),
  // Allow slightly longer input because users may paste "client_secret: <value>" blocks.
  clientSecret: z.string().min(20).max(600),
});

function sanitizeClientId(raw: string): string {
  const trimmed = raw.trim();
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^client[_\-\s]*id\s*:\s*/i, ""));
  const lastAppLine = [...lines].reverse().find((l) => l.includes("odelhub_app_"));
  return (lastAppLine ?? lines[lines.length - 1] ?? "").trim();
}

function sanitizeClientSecret(raw: string): string {
  const trimmed = raw.trim();
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^client[_\-\s]*secret\s*:\s*/i, ""));
  // clientSecret is "<clientId>.<secret>", so it usually contains a dot.
  const lastDotLine = [...lines].reverse().find((l) => l.includes("."));
  return (lastDotLine ?? lines[lines.length - 1] ?? "").trim();
}

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`dev-login:${clientIp(req)}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = LoginBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const clientId = sanitizeClientId(parsed.data.clientId);
    const clientSecret = sanitizeClientSecret(parsed.data.clientSecret);

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Invalid client credentials format. Paste only client_id and client_secret values." },
        { status: 400 },
      );
    }

    const verified = await verifyDeveloperClientCredentials(
      clientId,
      clientSecret,
    );
    if (!verified.ok) {
      return NextResponse.json({ error: "Invalid client credentials" }, { status: 401 });
    }

    const row = await prisma.developerApp.findUnique({ where: { id: verified.appId } });
    if (!row) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const token = await signDeveloperSession({ appId: row.id, clientId: row.clientId });
    if (!token) {
      return NextResponse.json({ error: "Session unavailable — configure JWT_SECRET" }, { status: 503 });
    }

    const res = NextResponse.json({ app: developerAppPublicView(row) });
    setDeveloperSessionCookie(res, token);
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/developers/auth/login" });
  }
}
