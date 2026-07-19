import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import type { HubKey } from "@/lib/ecosystem/hubs";
import { HUB_ORDER } from "@/lib/ecosystem/hubs";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";

/** `true` = hub is hidden (disappears from public UI). */
export type HubVisibilityState = Record<HubKey, boolean>;

const DEFAULT_STATE: HubVisibilityState = {
  tuition: false,
  play: false,
  dex: false,
  developers: false,
};

function rowToState(row: {
  tuitionHubHidden?: boolean;
  playHubHidden?: boolean;
  dexHubHidden?: boolean;
  developersHubHidden?: boolean;
} | null): HubVisibilityState {
  if (!row) return { ...DEFAULT_STATE };
  return {
    tuition: row.tuitionHubHidden === true,
    play: row.playHubHidden === true,
    dex: row.dexHubHidden === true,
    developers: row.developersHubHidden === true,
  };
}

function isUnknownHubHiddenFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ((err as { name?: string }).name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return (
    msg.includes("tuitionHubHidden") ||
    msg.includes("playHubHidden") ||
    msg.includes("dexHubHidden") ||
    msg.includes("developersHubHidden")
  );
}

export async function getHubVisibilityState(): Promise<HubVisibilityState> {
  const selectFull = {
    tuitionHubHidden: true,
    playHubHidden: true,
    dexHubHidden: true,
    developersHubHidden: true,
  } as const;

  try {
    const row = await withPrismaRetry(() =>
      prisma.siteUiSettings.findUnique({
        where: { key: PLATFORM_SITE_UI_KEY },
        select: selectFull,
      }),
    );
    return rowToState(row);
  } catch (err) {
    if (isUnknownHubHiddenFieldError(err)) {
      return { ...DEFAULT_STATE };
    }
    console.warn("[hub-visibility] load failed, assuming hubs are visible", err);
    return { ...DEFAULT_STATE };
  }
}

export async function isHubHidden(hub: HubKey): Promise<boolean> {
  const state = await getHubVisibilityState();
  return state[hub];
}

/** Hubs that are not hidden, in canonical order. */
export function visibleHubKeys(state: HubVisibilityState): HubKey[] {
  return HUB_ORDER.filter((key) => !state[key]);
}

/** First visible home-switcher hub (excludes developers), or null if all hidden. */
export function firstVisibleHomeShellHub(state: HubVisibilityState): HubKey | null {
  for (const key of HUB_ORDER) {
    if (key === "developers") continue;
    if (!state[key]) return key;
  }
  return null;
}
