"use client";

import { TonWalletSync } from "@/components/TonWalletSync";

export default function ClickerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TonWalletSync />
      {children}
    </>
  );
}
