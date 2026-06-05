import type { Metadata } from "next";
import type { PublicSiteUiSettings } from "@/lib/site-ui-shared";

const DEFAULT_ICON = "/playhub/favicon.svg";

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

/** Root layout metadata — uses master-uploaded platform logo when set. */
export function buildRootMetadata(siteUi: PublicSiteUiSettings, baseUrl?: string): Metadata {
  const base = (baseUrl ?? appBaseUrl()).replace(/\/$/, "") || "http://localhost:3000";
  const iconPath = siteUi.platformLogoUrl ?? DEFAULT_ICON;
  const iconAbsolute = iconPath.startsWith("http") ? iconPath : `${base}${iconPath}`;

  const ogImages: NonNullable<Metadata["openGraph"]>["images"] = siteUi.hasPlatformLogo
    ? [{ url: iconAbsolute, width: 512, height: 512, alt: siteUi.shareDefaultTitle }]
    : [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ODEL HUB logo" }];

  return {
    metadataBase: new URL(base),
    title: "ODEL HUB — Tuition, Play & Dex",
    description:
      "Tuition Hub: programme fees and settlement. Play Hub: engagement. Dex Hub: onramp & offramp rails — extensible ecosystem.",
    icons: {
      icon: [{ url: iconPath, type: siteUi.hasPlatformLogo ? undefined : "image/svg+xml" }],
      apple: siteUi.hasPlatformLogo ? [{ url: iconPath }] : undefined,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: siteUi.shareDefaultTitle || "ODEL HUB",
      title: "ODEL HUB — Tuition, Play & Dex",
      description:
        "Tuition payments, TON settlement, and multi-hub ecosystem — programmes, receipts, and school workspaces.",
      images: ogImages,
    },
    twitter: {
      card: siteUi.hasPlatformLogo ? "summary" : "summary_large_image",
      title: "ODEL HUB — Tuition, Play & Dex",
      description: "Tuition payments, TON settlement, and our ecosystem hubs.",
      images: siteUi.hasPlatformLogo ? [iconAbsolute] : ["/opengraph-image"],
    },
  };
}
