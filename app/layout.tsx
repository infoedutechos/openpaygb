import type { Metadata } from "next";
import "./globals.css";
import { ConditionalSiteHeaderServer } from "@/components/pay/ConditionalSiteHeaderServer";
import { ConditionalMainServer } from "@/components/pay/ConditionalMainServer";
import { PlatformSocialProvider } from "@/components/PlatformSocialProvider";
import { SiteChromeFooter } from "@/components/SiteChromeFooter";
import { ShareFab } from "@/components/ShareFab";
import { ConditionalSiteBottomNav } from "@/components/ConditionalSiteBottomNav";
import { buildRootMetadata } from "@/lib/root-metadata";
import { resolveRequestSiteOrigin } from "@/lib/request-site-origin";
import { getPublicSiteUiSettings } from "@/lib/site-ui-settings";

export async function generateMetadata(): Promise<Metadata> {
  const siteUi = await getPublicSiteUiSettings();
  const base = await resolveRequestSiteOrigin();
  return buildRootMetadata(siteUi, base);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteUi = await getPublicSiteUiSettings();
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased flex flex-col">
        <PlatformSocialProvider initial={siteUi}>
          <ConditionalSiteHeaderServer />
          <ConditionalMainServer>{children}</ConditionalMainServer>
          <SiteChromeFooter settings={siteUi} />
          <ConditionalSiteBottomNav />
          <ShareFab />
        </PlatformSocialProvider>
      </body>
    </html>
  );
}
