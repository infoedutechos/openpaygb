import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { withPrismaRetry } from "@/lib/prisma-retry";

export type OpenPayCardPlatformSettings = {
  enabled: boolean;
  guestCardEnabled: boolean;
  issueFeeTon: number;
};

const DEFAULT_ISSUE_FEE_TON = 5;

export async function getOpenPayCardPlatformSettings(): Promise<OpenPayCardPlatformSettings> {
  const row = await withPrismaRetry(() =>
    prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: {
        openPayCardEnabled: true,
        guestCardEnabled: true,
        openPayCardIssueFeeTon: true,
      },
    }),
  ).catch(() => null);

  if (!row) {
    return { enabled: true, guestCardEnabled: true, issueFeeTon: DEFAULT_ISSUE_FEE_TON };
  }

  const fee = row.openPayCardIssueFeeTon;
  return {
    enabled: row.openPayCardEnabled !== false,
    guestCardEnabled: row.guestCardEnabled !== false,
    issueFeeTon: typeof fee === "number" && fee > 0 ? fee : DEFAULT_ISSUE_FEE_TON,
  };
}

export async function patchOpenPayCardPlatformSettings(patch: {
  enabled?: boolean;
  guestCardEnabled?: boolean;
  issueFeeTon?: number;
}): Promise<OpenPayCardPlatformSettings> {
  const current = await getOpenPayCardPlatformSettings();
  const issueFeeTon =
    patch.issueFeeTon !== undefined
      ? Math.max(0.01, Math.min(10_000, patch.issueFeeTon))
      : current.issueFeeTon;
  const enabled = patch.enabled !== undefined ? patch.enabled : current.enabled;
  const guestCardEnabled =
    patch.guestCardEnabled !== undefined ? patch.guestCardEnabled : current.guestCardEnabled;

  await withPrismaRetry(() =>
    prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: {
        key: PLATFORM_SITE_UI_KEY,
        openPayCardEnabled: enabled,
        guestCardEnabled,
        openPayCardIssueFeeTon: issueFeeTon,
      },
      update: {
        openPayCardEnabled: enabled,
        guestCardEnabled,
        openPayCardIssueFeeTon: issueFeeTon,
      },
    }),
  );

  return { enabled, guestCardEnabled, issueFeeTon };
}
