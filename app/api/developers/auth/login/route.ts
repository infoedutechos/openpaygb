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
  clientSecret: z.string().min(20).max(256),
});

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

    const verified = await verifyDeveloperClientCredentials(
      parsed.data.clientId,
      parsed.data.clientSecret,
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
