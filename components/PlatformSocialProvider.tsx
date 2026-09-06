"use client";

import { createContext, useContext, useMemo } from "react";
import type { PublicSiteUiSettings } from "@/lib/site-ui-shared";

const PlatformSocialContext = createContext<PublicSiteUiSettings | null>(null);

export function PlatformSocialProvider({
  initial,
  children,
}: {
  initial: PublicSiteUiSettings;
  children: React.ReactNode;
}) {
  const value = useMemo(() => initial, [initial]);
  return <PlatformSocialContext.Provider value={value}>{children}</PlatformSocialContext.Provider>;
}

export function usePlatformSocial(): PublicSiteUiSettings {
  const ctx = useContext(PlatformSocialContext);
  if (!ctx) {
    return {
      socialLinks: [],
      shareEnabled: true,
      shareDefaultTitle: "ODELPay HUB",
      shareDefaultText: "",
      supportPhone: "",
      supportEmail: "",
      communitySupportUrl: "",
      showSupportPhone: true,
      showSupportEmail: true,
      showCommunitySupport: true,
      footerIntro: "",
      footerShowQuickLinks: true,
      footerCopyrightVisible: true,
      footerMode: "everywhere",
      footerPathList: [],
      homeScreenEnabled: true,
      homeScreenShowOnHome: true,
      homeScreenTitle: "ODELPay HUB",
      homeScreenShortName: "ODELPay HUB",
      homeScreenDescription: "",
      homeScreenThemeColor: "#0ea5e9",
      hasPlatformLogo: false,
      platformLogoUrl: null,
      hasCopilotBubbleImage: false,
      copilotBubbleImageUrl: null,
      copilotAssistantName: "ODELPay HUB Copilot",
      platformDisplayName: "ODELPay HUB",
      themeAccentHex: "",
      homeHeroHeadline: "",
      homeHeroSubhead: "",
    };
  }
  return ctx;
}
