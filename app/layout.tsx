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
import { buildRootMetadata } from "@/lib/root-metadata";
import { resolveRequestSiteOrigin } from "@/lib/request-site-origin";
import { getPublicSiteUiSettings } from "@/lib/site-ui-settings";
import { headers } from "next/headers";
import { parseStandaloneAppId, standaloneAppById, standaloneMetadataForApp } from "@/lib/standalone-apps";

export async function generateMetadata(): Promise<Metadata> {
  const siteUi = await getPublicSiteUiSettings();
  const base = await resolveRequestSiteOrigin();
  const appId = parseStandaloneAppId((await headers()).get("x-standalone-app"));
  if (appId) {
    const app = standaloneAppById(appId);
    const { title, description } = standaloneMetadataForApp(app);
    const root = buildRootMetadata(siteUi, base);
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
  const siteUi = await getPublicSiteUiSettings();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased flex flex-col" suppressHydrationWarning>
        <StandaloneAppRoot>
          <PlatformSocialProvider initial={siteUi}>
            <TonConnectAppProvider>
              <ConditionalSiteHeaderServer />
              <ConditionalMainServer>{children}</ConditionalMainServer>
              <SiteChromeFooter settings={siteUi} />
              <ConditionalSiteBottomNav />
              <ShareFab />
              <PwaTitleBarMenu />
              <PwaRefreshShortcutHandler />
              <PlatformAssistShell />
            </TonConnectAppProvider>
          </PlatformSocialProvider>
        </StandaloneAppRoot>
      </body>
    </html>
  );
}
