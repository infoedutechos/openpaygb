import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import {
  activatePlayHubLaunchTarget,
  defaultPlayHubLaunchTargets,
  deletePlayHubLaunchTarget,
  parsePlayHubLaunchTargets,
  serializePlayHubLaunchTargets,
  upsertPlayHubLaunchTarget,
  type PlayHubLaunchTarget,
  type PlayHubLaunchUpsertInput,
} from "@/lib/play-hub-launch-targets";
import { withPrismaRetry } from "@/lib/prisma-retry";

function isUnknownLaunchFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ((err as { name?: string }).name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return msg.includes("playHubLaunchTargetsJson");
}

async function readRawJson(): Promise<string | null> {
  try {
    const row = await withPrismaRetry(() =>
      prisma.siteUiSettings.upsert({
        where: { key: PLATFORM_SITE_UI_KEY },
        create: { key: PLATFORM_SITE_UI_KEY },
        update: {},
        select: { playHubLaunchTargetsJson: true },
      }),
    );
    return row.playHubLaunchTargetsJson ?? "[]";
  } catch (err) {
    if (isUnknownLaunchFieldError(err)) return null;
    throw err;
  }
}

export async function getPlayHubLaunchTargets(): Promise<PlayHubLaunchTarget[]> {
  try {
    const raw = await readRawJson();
    if (raw === null) return defaultPlayHubLaunchTargets();
    return parsePlayHubLaunchTargets(raw);
  } catch (err) {
    console.warn("[play-hub-launch] load failed, using defaults", err);
    return defaultPlayHubLaunchTargets();
  }
}

async function saveTargets(targets: PlayHubLaunchTarget[]) {
  const json = serializePlayHubLaunchTargets(targets);
  try {
    await withPrismaRetry(() =>
      prisma.siteUiSettings.upsert({
        where: { key: PLATFORM_SITE_UI_KEY },
        create: { key: PLATFORM_SITE_UI_KEY, playHubLaunchTargetsJson: json },
        update: { playHubLaunchTargetsJson: json },
      }),
    );
  } catch (err) {
    if (isUnknownLaunchFieldError(err)) {
      throw new Error(
        "Database schema missing playHubLaunchTargetsJson — redeploy after prisma generate / migrate.",
      );
    }
    throw err;
  }
  return parsePlayHubLaunchTargets(json);
}

export async function upsertPlayHubLaunchTargetPersisted(input: PlayHubLaunchUpsertInput) {
  const current = await getPlayHubLaunchTargets();
  const next = upsertPlayHubLaunchTarget(current, input);
  return saveTargets(next);
}

export async function activatePlayHubLaunchTargetPersisted(id: string) {
  const current = await getPlayHubLaunchTargets();
  const next = activatePlayHubLaunchTarget(current, id);
  return saveTargets(next);
}

export async function deletePlayHubLaunchTargetPersisted(id: string) {
  const current = await getPlayHubLaunchTargets();
  const next = deletePlayHubLaunchTarget(current, id);
  return saveTargets(next);
}
