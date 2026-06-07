import { NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { handleTelegramUpdate } from "@/lib/telegram/flow";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { tryMarkWebhookProcessed } from "@/lib/webhook-dedupe";
import { requireConfiguredSecret } from "@/lib/production-secrets";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

async function isAuthorized(req: Request): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  await warmDeploymentEnvCache();
  const secret =
    deploymentEnv("TELEGRAM_WEBHOOK_SECRET") ||
    deploymentEnv("TELEGRAM_SECRET_TOKEN") ||
    "";
  const secretCheck = requireConfiguredSecret(
    "TELEGRAM_WEBHOOK_SECRET",
    secret || undefined,
  );
  if (!secretCheck.ok) return secretCheck;
  if (!secret) return { ok: true };

  const header =
    req.headers.get("x-telegram-bot-api-secret-token") ??
    req.headers.get("x-telegram-bot-secret") ??
    "";
  if (header === secret) return { ok: true };
  return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export async function POST(req: Request) {
  const auth = await isAuthorized(req);
  if (!auth.ok) return auth.response;
  await warmDeploymentEnvCache();
  if (rateLimitHit(`tg-hook:${clientIp(req)}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const uid = update.update_id;
  if (uid != null) {
    const first = await tryMarkWebhookProcessed("telegram", String(uid));
    if (!first) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }
  try {
    await handleTelegramUpdate(update);
  } catch (e) {
    console.error("[telegram webhook]", e);
    if (uid != null) {
      const dedupeKey = `telegram:${String(uid)}`.slice(0, 900);
      await prisma.processedWebhook.deleteMany({ where: { dedupeKey } }).catch(() => {});
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
