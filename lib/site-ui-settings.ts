import "server-only";

import { prisma } from "@/lib/prisma";
import { isTransientMongoError, withPrismaRetry } from "@/lib/prisma-retry";
import { platformLogoUrl } from "@/lib/platform-logo";
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

function rowToSettings(row: {
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
  homeScreenEnabled?: boolean;
  homeScreenShowOnHome?: boolean;
  homeScreenTitle?: string;
  homeScreenShortName?: string;
  homeScreenDescription?: string;
  homeScreenThemeColor?: string;
  platformLogoUploadedAt?: Date | null;
  socialLinkIcons?: unknown;
}): SiteUiSettingsRow {
  const stored = parseStoredSocialLinks(row.socialLinks);
  const icons = parseSocialLinkIcons(row.socialLinkIcons);
  const socialLinks: SocialLinkDisplay[] = mergeSocialLinks(stored).map((link) => {
    const icon = icons[link.key];
    return {
      ...link,
      hasCustomIcon: Boolean(icon),
      iconUrl: socialLinkIconUrl(link.key, icon),
    };
  });
  const logoAt = row.platformLogoUploadedAt ?? null;
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
  homeScreenEnabled: true,
  homeScreenShowOnHome: true,
  homeScreenTitle: true,
  homeScreenShortName: true,
  homeScreenDescription: true,
  homeScreenThemeColor: true,
  platformLogoUploadedAt: true,
} as const;

const siteUiSelect = {
  ...siteUiSelectBase,
  socialLinkIcons: true,
} as const;

export function isUnknownSocialLinkIconsFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return msg.includes("socialLinkIcons") && msg.includes("Unknown field");
}

function isTransientPrismaIoError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "");
  return (
    msg.includes("connection was forcibly closed") ||
    msg.includes("RetryableWriteError") ||
    msg.includes("I/O error")
  );
}

async function loadSiteUiRow() {
  try {
    return await withPrismaRetry(() =>
      prisma.siteUiSettings.findUnique({
        where: { key: PLATFORM_SITE_UI_KEY },
        select: siteUiSelect,
      }),
    );
  } catch (err) {
    if (isTransientPrismaIoError(err) || isTransientMongoError(err)) {
      console.warn("[site-ui-settings] transient DB error, using defaults");
      return null;
    }
    if (!isUnknownSocialLinkIconsFieldError(err)) throw err;
    // Stale Prisma client in a running dev server — omit field until `npx prisma generate` + restart.
    return withPrismaRetry(() =>
      prisma.siteUiSettings.findUnique({
        where: { key: PLATFORM_SITE_UI_KEY },
        select: siteUiSelectBase,
      }),
    ).catch(() => null);
  }
}

export async function getPlatformSiteUiSettings(): Promise<SiteUiSettingsRow> {
  const row = await loadSiteUiRow();
  if (!row) {
    return rowToSettings({
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
      homeScreenEnabled: true,
      homeScreenShowOnHome: true,
      homeScreenTitle: "ODEL HUB",
      homeScreenShortName: "ODEL HUB",
      homeScreenDescription: "",
      homeScreenThemeColor: "#0ea5e9",
      platformLogoUploadedAt: null,
      socialLinkIcons: {},
    });
  }
  return rowToSettings(row);
}

export async function getPublicSiteUiSettings(): Promise<PublicSiteUiSettings> {
  const s = await getPlatformSiteUiSettings();
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
  };
}
