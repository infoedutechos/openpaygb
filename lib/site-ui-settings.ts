import "server-only";

import { prisma } from "@/lib/prisma";
import { isPrismaEngineEmptyError, isTransientMongoError, withPrismaRetry } from "@/lib/prisma-retry";
import { copilotBubbleImageUrl } from "@/lib/copilot-bubble-image";
import { platformLogoUrl } from "@/lib/platform-logo";
import { resolveSocialLinkIconUrl } from "@/lib/social-link-brand-icon";
import { parseSocialLinkIcons, socialLinkIconUrl } from "@/lib/social-link-icons";
import {
  mergeSocialLinks,
  parseStoredSocialLinks,
  PLATFORM_SITE_UI_KEY,
  type SiteUiSettingsRow,
  type PublicSiteUiSettings,
  type SocialLinkDisplay,
} from "@/lib/site-ui-shared";

export * from "@/lib/site-ui-shared";

type SiteUiDbRow = {
  key: string;
  footerMode: string;
  footerPathList: string[];
  footerIntro: string;
  footerShowQuickLinks: boolean;
  footerCopyrightVisible: boolean;
  checkoutPlatformFeeDefaultUgx: number;
  socialLinks: unknown;
  shareEnabled: boolean;
  shareDefaultTitle: string;
  shareDefaultText: string;
  supportPhone: string;
  supportEmail: string;
  communitySupportUrl?: string;
  showSupportPhone?: boolean;
  showSupportEmail?: boolean;
  showCommunitySupport?: boolean;
  homeScreenEnabled?: boolean;
  homeScreenShowOnHome?: boolean;
  homeScreenTitle?: string;
  homeScreenShortName?: string;
  homeScreenDescription?: string;
  homeScreenThemeColor?: string;
  platformLogoUploadedAt?: Date | null;
  copilotBubbleImageUploadedAt?: Date | null;
  copilotAssistantName?: string;
  socialLinkIcons?: unknown;
};

function rowToSettings(row: SiteUiDbRow): SiteUiSettingsRow {
  const stored = parseStoredSocialLinks(row.socialLinks);
  const icons = parseSocialLinkIcons(row.socialLinkIcons);
  const socialLinks: SocialLinkDisplay[] = mergeSocialLinks(stored).map((link) => {
    const icon = icons[link.key];
    return {
      ...link,
      hasCustomIcon: Boolean(icon),
      iconUrl: resolveSocialLinkIconUrl(link.key, socialLinkIconUrl(link.key, icon)),
    };
  });
  const logoAt = row.platformLogoUploadedAt ?? null;
  const bubbleAt = row.copilotBubbleImageUploadedAt ?? null;
  return {
    key: row.key,
    footerMode: row.footerMode,
    footerPathList: row.footerPathList ?? [],
    footerIntro: row.footerIntro ?? "",
    footerShowQuickLinks: row.footerShowQuickLinks,
    footerCopyrightVisible: row.footerCopyrightVisible,
    checkoutPlatformFeeDefaultUgx: row.checkoutPlatformFeeDefaultUgx,
    socialLinks,
    shareEnabled: row.shareEnabled,
    shareDefaultTitle: row.shareDefaultTitle?.trim() || "ODEL HUB",
    shareDefaultText:
      row.shareDefaultText?.trim() ||
      "Check out ODEL HUB — tuition payments, TON settlement, and our ecosystem hubs.",
    supportPhone: row.supportPhone?.trim() || process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "",
    supportEmail: row.supportEmail?.trim() || process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "",
    communitySupportUrl:
      row.communitySupportUrl?.trim() ||
      process.env.NEXT_PUBLIC_COMMUNITY_SUPPORT_URL?.trim() ||
      "https://chat.whatsapp.com/InHwzpKi3EHI8BMZtmp0J3",
    showSupportPhone: row.showSupportPhone === false ? false : true,
    showSupportEmail: row.showSupportEmail === false ? false : true,
    showCommunitySupport: row.showCommunitySupport === false ? false : true,
    homeScreenEnabled: row.homeScreenEnabled ?? true,
    homeScreenShowOnHome: row.homeScreenShowOnHome ?? true,
    homeScreenTitle: row.homeScreenTitle?.trim() || "ODEL HUB",
    homeScreenShortName: row.homeScreenShortName?.trim() || "ODEL HUB",
    homeScreenDescription:
      row.homeScreenDescription?.trim() ||
      "Tuition, TON payments, Play & Dex — save ODEL HUB to your home screen or desktop.",
    homeScreenThemeColor: row.homeScreenThemeColor?.trim() || "#0ea5e9",
    hasPlatformLogo: Boolean(logoAt),
    platformLogoUploadedAt: logoAt?.toISOString() ?? null,
    platformLogoUrl: platformLogoUrl(logoAt),
    hasCopilotBubbleImage: Boolean(bubbleAt),
    copilotBubbleImageUploadedAt: bubbleAt?.toISOString() ?? null,
    copilotBubbleImageUrl: copilotBubbleImageUrl(bubbleAt),
    copilotAssistantName: row.copilotAssistantName?.trim() || "ODEL HUB Copilot",
  };
}

const siteUiSelectBase = {
  key: true,
  footerMode: true,
  footerPathList: true,
  footerIntro: true,
  footerShowQuickLinks: true,
  footerCopyrightVisible: true,
  checkoutPlatformFeeDefaultUgx: true,
  socialLinks: true,
  shareEnabled: true,
  shareDefaultTitle: true,
  shareDefaultText: true,
  supportPhone: true,
  supportEmail: true,
  communitySupportUrl: true,
  showSupportPhone: true,
  showSupportEmail: true,
  showCommunitySupport: true,
  homeScreenEnabled: true,
  homeScreenShowOnHome: true,
  homeScreenTitle: true,
  homeScreenShortName: true,
  homeScreenDescription: true,
  homeScreenThemeColor: true,
  platformLogoUploadedAt: true,
  copilotBubbleImageUploadedAt: true,
  copilotAssistantName: true,
} as const;

const siteUiSelect = {
  ...siteUiSelectBase,
  socialLinkIcons: true,
} as const;

function isPrismaUnknownFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return msg.includes("Unknown field");
}

export function isUnknownSocialLinkIconsFieldError(err: unknown): boolean {
  if (!isPrismaUnknownFieldError(err)) return false;
  const msg = String((err as { message?: string }).message ?? "");
  return msg.includes("socialLinkIcons");
}

function isUnknownSiteUiSupportPanelFieldError(err: unknown): boolean {
  if (!isPrismaUnknownFieldError(err)) return false;
  const msg = String((err as { message?: string }).message ?? "");
  return (
    msg.includes("communitySupportUrl") ||
    msg.includes("showSupportPhone") ||
    msg.includes("showSupportEmail") ||
    msg.includes("showCommunitySupport") ||
    msg.includes("copilotBubbleImageUploadedAt")
  );
}

/** Omit fields that may be missing from stale Prisma client or older Mongo documents. */
const siteUiSelectLegacy = {
  key: true,
  footerMode: true,
  footerPathList: true,
  footerIntro: true,
  footerShowQuickLinks: true,
  footerCopyrightVisible: true,
  checkoutPlatformFeeDefaultUgx: true,
  socialLinks: true,
  shareEnabled: true,
  shareDefaultTitle: true,
  shareDefaultText: true,
  supportPhone: true,
  supportEmail: true,
  homeScreenEnabled: true,
  homeScreenShowOnHome: true,
  homeScreenTitle: true,
  homeScreenShortName: true,
  homeScreenDescription: true,
  homeScreenThemeColor: true,
  platformLogoUploadedAt: true,
} as const;

function defaultSiteUiRow(): Parameters<typeof rowToSettings>[0] {
  return {
    key: PLATFORM_SITE_UI_KEY,
    footerMode: "everywhere",
    footerPathList: [],
    footerIntro: "",
    footerShowQuickLinks: true,
    footerCopyrightVisible: true,
    checkoutPlatformFeeDefaultUgx: -1,
    socialLinks: [],
    shareEnabled: true,
    shareDefaultTitle: "ODEL HUB",
    shareDefaultText: "",
    supportPhone: "",
    supportEmail: "",
    communitySupportUrl: "",
    showSupportPhone: true,
    showSupportEmail: true,
    showCommunitySupport: true,
    homeScreenEnabled: true,
    homeScreenShowOnHome: true,
    homeScreenTitle: "ODEL HUB",
    homeScreenShortName: "ODEL HUB",
    homeScreenDescription: "",
    homeScreenThemeColor: "#0ea5e9",
    platformLogoUploadedAt: null,
    copilotAssistantName: "ODEL HUB Copilot",
    socialLinkIcons: {},
  };
}

function isSiteUiLoadFailure(err: unknown): boolean {
  return isTransientMongoError(err) || isPrismaEngineEmptyError(err) || isPrismaUnknownFieldError(err);
}

function isTransientPrismaIoError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "");
  return (
    msg.includes("connection was forcibly closed") ||
    msg.includes("RetryableWriteError") ||
    msg.includes("I/O error")
  );
}

async function loadSiteUiRowWithSelect(select: Record<string, boolean>): Promise<SiteUiDbRow | null> {
  const row = await withPrismaRetry(() =>
    prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select,
    }),
  );
  return row as SiteUiDbRow | null;
}

function skipDbForStaticBuild(): boolean {
  return process.env.SKIP_DB_AT_BUILD === "true";
}

async function loadSiteUiRow(): Promise<SiteUiDbRow | null> {
  if (skipDbForStaticBuild()) return null;

  const attempts: Array<Record<string, boolean>> = [siteUiSelect, siteUiSelectBase, siteUiSelectLegacy];

  for (let i = 0; i < attempts.length; i += 1) {
    try {
      return await loadSiteUiRowWithSelect(attempts[i]!);
    } catch (err) {
      const hasFallback = i < attempts.length - 1;
      if (isSiteUiLoadFailure(err) && hasFallback) {
        console.warn("[site-ui-settings] site UI query fallback", {
          attempt: i + 1,
          reason: (err as Error)?.name ?? "unknown",
        });
        continue;
      }
      if (isTransientPrismaIoError(err) || isTransientMongoError(err) || isPrismaEngineEmptyError(err)) {
        console.warn("[site-ui-settings] transient DB error, using defaults");
        return null;
      }
      if (hasFallback && (isUnknownSocialLinkIconsFieldError(err) || isUnknownSiteUiSupportPanelFieldError(err))) {
        continue;
      }
      console.warn("[site-ui-settings] load failed, using defaults", err);
      return null;
    }
  }

  return null;
}

let publicSiteUiCache: { at: number; data: PublicSiteUiSettings } | null = null;
const PUBLIC_SITE_UI_CACHE_MS = 8_000;

export async function getPlatformSiteUiSettings(): Promise<SiteUiSettingsRow> {
  const row = await loadSiteUiRow();
  if (!row) {
    return rowToSettings(defaultSiteUiRow());
  }
  return rowToSettings(row);
}

function toPublicSiteUiSettings(s: SiteUiSettingsRow): PublicSiteUiSettings {
  return {
    socialLinks: s.socialLinks.filter((l) => l.enabled && l.url.trim()).map((l) => ({
      key: l.key,
      label: l.label,
      url: l.url,
      enabled: l.enabled,
      showInFooter: l.showInFooter,
      showInSupport: l.showInSupport,
      sortOrder: l.sortOrder,
      iconUrl: l.iconUrl ?? null,
    })),
    shareEnabled: s.shareEnabled,
    shareDefaultTitle: s.shareDefaultTitle,
    shareDefaultText: s.shareDefaultText,
    supportPhone: s.supportPhone,
    supportEmail: s.supportEmail,
    communitySupportUrl: s.communitySupportUrl,
    showSupportPhone: s.showSupportPhone,
    showSupportEmail: s.showSupportEmail,
    showCommunitySupport: s.showCommunitySupport,
    footerIntro: s.footerIntro,
    footerShowQuickLinks: s.footerShowQuickLinks,
    footerCopyrightVisible: s.footerCopyrightVisible,
    footerMode: s.footerMode,
    footerPathList: s.footerPathList,
    homeScreenEnabled: s.homeScreenEnabled,
    homeScreenShowOnHome: s.homeScreenShowOnHome,
    homeScreenTitle: s.homeScreenTitle,
    homeScreenShortName: s.homeScreenShortName,
    homeScreenDescription: s.homeScreenDescription,
    homeScreenThemeColor: s.homeScreenThemeColor,
    hasPlatformLogo: s.hasPlatformLogo,
    platformLogoUrl: s.platformLogoUrl,
    hasCopilotBubbleImage: s.hasCopilotBubbleImage,
    copilotBubbleImageUrl: s.copilotBubbleImageUrl,
    copilotAssistantName: s.copilotAssistantName,
  };
}

export async function getPublicSiteUiSettings(): Promise<PublicSiteUiSettings> {
  const now = Date.now();
  if (publicSiteUiCache && now - publicSiteUiCache.at < PUBLIC_SITE_UI_CACHE_MS) {
    return publicSiteUiCache.data;
  }

  try {
    const s = await getPlatformSiteUiSettings();
    const data = toPublicSiteUiSettings(s);
    publicSiteUiCache = { at: now, data };
    return data;
  } catch (err) {
    console.warn("[site-ui-settings] getPublicSiteUiSettings failed, using defaults", err);
    const data = toPublicSiteUiSettings(rowToSettings(defaultSiteUiRow()));
    publicSiteUiCache = { at: now, data };
    return data;
  }
}

/** Bust in-memory cache after master PATCH (same Node process). */
export function invalidatePublicSiteUiCache(): void {
  publicSiteUiCache = null;
}
