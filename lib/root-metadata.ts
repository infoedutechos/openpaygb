import type { Metadata } from "next";
import type { PublicSiteUiSettings } from "@/lib/site-ui-shared";
import {
  getPlatformBranding,
  resolvedSeoDescription,
  resolvedSeoTitle,
} from "@/lib/platform-customisation";

const DEFAULT_ICON = "/playhub/favicon.svg";

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

/** Root layout metadata — uses master-uploaded platform logo when set. */
export async function buildRootMetadata(siteUi: PublicSiteUiSettings, baseUrl?: string): Promise<Metadata> {
  const base = (baseUrl ?? appBaseUrl()).replace(/\/$/, "") || "http://localhost:3000";
  const iconPath = siteUi.platformLogoUrl ?? DEFAULT_ICON;
  const iconAbsolute = iconPath.startsWith("http") ? iconPath : `${base}${iconPath}`;
  const branding = await getPlatformBranding();
  const title = resolvedSeoTitle(branding);
  const description = resolvedSeoDescription(branding);
  const siteName = branding.platformDisplayName || siteUi.shareDefaultTitle || "ODEL HUB";

  const ogImages: NonNullable<Metadata["openGraph"]>["images"] = siteUi.hasPlatformLogo
    ? [{ url: iconAbsolute, width: 512, height: 512, alt: siteName }]
    : [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${siteName} logo` }];

  return {
    metadataBase: new URL(base),
    title,
    description,
    icons: {
      icon: [{ url: iconPath, type: siteUi.hasPlatformLogo ? undefined : "image/svg+xml" }],
      apple: siteUi.hasPlatformLogo ? [{ url: iconPath }] : undefined,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName,
      title,
      description,
      images: ogImages,
    },
    twitter: {
      card: siteUi.hasPlatformLogo ? "summary" : "summary_large_image",
      title,
      description,
      images: siteUi.hasPlatformLogo ? [iconAbsolute] : ["/opengraph-image"],
    },
  };
}
