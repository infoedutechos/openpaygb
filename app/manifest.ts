import type { MetadataRoute } from "next";
import { getPlatformSiteUiSettings } from "@/lib/site-ui-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getPlatformSiteUiSettings();

  return {
    name: s.homeScreenTitle,
    short_name: s.homeScreenShortName,
    description: s.homeScreenDescription,
    /** Relative — resolved with layout metadataBase (request origin, not stale NEXT_PUBLIC_APP_URL). */
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    shortcuts: [
      {
        name: "Refresh app",
        short_name: "Refresh",
        url: "/?pwa_refresh=1",
        icons: s.hasPlatformLogo && s.platformLogoUrl
          ? [{ src: s.platformLogoUrl, sizes: "96x96", type: "image/png" }]
          : [{ src: "/playhub/favicon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
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
