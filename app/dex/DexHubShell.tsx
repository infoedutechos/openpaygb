"use client";

import DexHubBottomNav from "@/components/hub/DexHubBottomNav";
import { DexHubMobileMenu } from "@/components/hub/DexHubMobileMenu";

export default function DexHubShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-[5.25rem]">
      <DexHubMobileMenu />
      {children}
      <DexHubBottomNav />
    </div>
  );
}
