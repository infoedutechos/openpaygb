import type { MetadataRoute } from "next";
import { getPlatformSiteUiSettings } from "@/lib/site-ui-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getPlatformSiteUiSettings();
  const startUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "/";

  return {
    name: s.homeScreenTitle,
    short_name: s.homeScreenShortName,
    description: s.homeScreenDescription,
    start_url: startUrl.endsWith("/") ? startUrl : `${startUrl}/`,
    display: "standalone",
    background_color: "#08070a",
    theme_color: s.homeScreenThemeColor,
    orientation: "portrait-primary",
    icons: s.hasPlatformLogo && s.platformLogoUrl
      ? [
          {
            src: s.platformLogoUrl,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: s.platformLogoUrl,
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
        ]
      : [
          {
            src: "/playhub/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
  };
}
