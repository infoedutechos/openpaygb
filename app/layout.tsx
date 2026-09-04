import type { Metadata } from "next";
import "./globals.css";
import { ConditionalSiteHeaderServer } from "@/components/pay/ConditionalSiteHeaderServer";
import { ConditionalMainServer } from "@/components/pay/ConditionalMainServer";
import { PlatformSocialProvider } from "@/components/PlatformSocialProvider";
import { TonConnectAppProvider } from "@/components/TonConnectAppProvider";
import { SiteChromeFooter } from "@/components/SiteChromeFooter";
import { ShareFab } from "@/components/ShareFab";
import PlatformAssistShell from "@/components/platform/PlatformAssistShell";
import { ConditionalSiteBottomNav } from "@/components/ConditionalSiteBottomNav";
import { PwaTitleBarMenu } from "@/components/PwaTitleBarMenu";
import { PwaRefreshShortcutHandler } from "@/components/PwaRefreshShortcutHandler";
import { StandaloneAppRoot } from "@/components/standalone/StandaloneAppRoot";
import { VisitBeacon } from "@/components/hub/VisitBeacon";
import { HubVisibilityProvider } from "@/components/hub/HubVisibilityProvider";
import { DevNetworkFetchGuard } from "@/components/DevNetworkFetchGuard";
import { buildRootMetadata } from "@/lib/root-metadata";
import { getPlatformBranding } from "@/lib/platform-customisation";
import { resolveRequestSiteOrigin } from "@/lib/request-site-origin";
import { getPublicSiteUiSettings } from "@/lib/site-ui-settings";
import { getHubVisibilityState } from "@/lib/hub-visibility";
import { headers } from "next/headers";
import { parseStandaloneAppId, standaloneAppById, standaloneMetadataForApp } from "@/lib/standalone-apps";

export async function generateMetadata(): Promise<Metadata> {
  const siteUi = await getPublicSiteUiSettings();
  const base = await resolveRequestSiteOrigin();
  const appId = parseStandaloneAppId((await headers()).get("x-standalone-app"));
  if (appId) {
    const app = standaloneAppById(appId);
    const { title, description } = standaloneMetadataForApp(app);
    const root = await buildRootMetadata(siteUi, base);
    return {
      ...root,
      title,
      description,
      openGraph: { ...root.openGraph, title, description },
      twitter: { ...root.twitter, title, description },
    };
  }
  return buildRootMetadata(siteUi, base);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [siteUi, branding, hubVisibility] = await Promise.all([
    getPublicSiteUiSettings(),
    getPlatformBranding(),
    getHubVisibilityState(),
  ]);
  const accent = branding.themeAccentHex.trim();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-dvh antialiased flex flex-col"
        suppressHydrationWarning
        style={accent ? ({ ["--accent" as string]: accent } as React.CSSProperties) : undefined}
      >
        <StandaloneAppRoot>
          <PlatformSocialProvider initial={siteUi}>
            <HubVisibilityProvider initial={hubVisibility}>
              <TonConnectAppProvider>
                <DevNetworkFetchGuard />
                <ConditionalSiteHeaderServer />
                <ConditionalMainServer>{children}</ConditionalMainServer>
                <SiteChromeFooter settings={siteUi} />
                <ConditionalSiteBottomNav />
                <ShareFab />
                <PwaTitleBarMenu />
                <PwaRefreshShortcutHandler />
                <PlatformAssistShell />
                <VisitBeacon />
              </TonConnectAppProvider>
            </HubVisibilityProvider>
          </PlatformSocialProvider>
        </StandaloneAppRoot>
      </body>
    </html>
  );
}
