import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  developerAppPublicView,
  hashDeveloperClientSecret,
} from "@/lib/developer-app";
import { readDeveloperSessionFromCookies } from "@/lib/developer-session";

export async function requireDeveloperSession(): Promise<
  | { ok: true; app: ReturnType<typeof developerAppPublicView> }
  | { ok: false; response: NextResponse }
> {
  const session = await readDeveloperSessionFromCookies();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Developer sign-in required" }, { status: 401 }),
    };
  }

  const row = await prisma.developerApp.findUnique({
    where: { id: session.appId },
  });

  if (!row || !row.enabled || row.clientId !== session.clientId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid developer session" }, { status: 401 }),
    };
  }

  return { ok: true, app: developerAppPublicView(row) };
}

export async function verifyDeveloperClientCredentials(
  clientId: string,
  clientSecret: string,
): Promise<{ ok: true; appId: string } | { ok: false }> {
  const row = await prisma.developerApp.findUnique({
    where: { clientId: clientId.trim() },
    select: { id: true, clientSecretHash: true, enabled: true },
  });
  if (!row || !row.enabled) return { ok: false };
  const hash = hashDeveloperClientSecret(clientSecret.trim());
  if (hash !== row.clientSecretHash) return { ok: false };
  return { ok: true, appId: row.id };
}
