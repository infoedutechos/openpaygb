import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import type { HubKey } from "@/lib/ecosystem/hubs";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";

export type HubMaintenanceState = Record<HubKey, boolean>;

const DEFAULT_STATE: HubMaintenanceState = {
  tuition: false,
  play: false,
  dex: false,
};

function rowToState(row: {
  tuitionHubMaintenance?: boolean;
  playHubMaintenance?: boolean;
  dexHubMaintenance?: boolean;
} | null): HubMaintenanceState {
  if (!row) return { ...DEFAULT_STATE };
  return {
    tuition: row.tuitionHubMaintenance === true,
    play: row.playHubMaintenance === true,
    dex: row.dexHubMaintenance === true,
  };
}

function isUnknownHubMaintenanceFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ((err as { name?: string }).name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return (
    msg.includes("tuitionHubMaintenance") ||
    msg.includes("playHubMaintenance") ||
    msg.includes("dexHubMaintenance")
  );
}

export async function getHubMaintenanceState(): Promise<HubMaintenanceState> {
  const selectFull = {
    tuitionHubMaintenance: true,
    playHubMaintenance: true,
    dexHubMaintenance: true,
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
    if (isUnknownHubMaintenanceFieldError(err)) {
      return { ...DEFAULT_STATE };
    }
    console.warn("[hub-maintenance] load failed, assuming hubs are live", err);
    return { ...DEFAULT_STATE };
  }
}

export async function isHubUnderMaintenance(hub: HubKey): Promise<boolean> {
  const state = await getHubMaintenanceState();
  return state[hub];
}
