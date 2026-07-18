"use client";

import { TonWalletSync } from "@/components/TonWalletSync";
import { PlayHubMobileMenu } from "@/components/hub/PlayHubMobileMenu";

export default function ClickerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TonWalletSync />
      <PlayHubMobileMenu />
      {children}
    </>
  );
}
