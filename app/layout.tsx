import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalSiteHeader } from "@/components/pay/ConditionalSiteHeader";
import { ConditionalMain } from "@/components/pay/ConditionalMain";
import { PlatformSocialProvider } from "@/components/PlatformSocialProvider";
import { SiteChromeFooter } from "@/components/SiteChromeFooter";
import { ShareFab } from "@/components/ShareFab";
import { ConditionalSiteBottomNav } from "@/components/ConditionalSiteBottomNav";
import { buildRootMetadata } from "@/lib/root-metadata";
import { getPublicSiteUiSettings } from "@/lib/site-ui-settings";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  /** Avoid dev warning when client-heavy routes delay first paint of preloaded layout.css */
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const siteUi = await getPublicSiteUiSettings();
  return buildRootMetadata(siteUi);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteUi = await getPublicSiteUiSettings();
  return (
    <html lang="en">
      <body
        className={`${inter.variable} min-h-dvh antialiased flex flex-col`}
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        <PlatformSocialProvider initial={siteUi}>
          <ConditionalSiteHeader />
          <ConditionalMain>{children}</ConditionalMain>
          <SiteChromeFooter settings={siteUi} />
          <ConditionalSiteBottomNav />
          <ShareFab />
        </PlatformSocialProvider>
      </body>
    </html>
  );
}
