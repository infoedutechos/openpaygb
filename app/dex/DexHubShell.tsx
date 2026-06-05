"use client";

import DexHubBottomNav from "@/components/hub/DexHubBottomNav";

export default function DexHubShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-[5.25rem]">
      {children}
      <DexHubBottomNav />
    </div>
  );
}
