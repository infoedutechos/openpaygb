"use client";

import DexHubBottomNav from "@/components/hub/DexHubBottomNav";
import { TonConnectShell } from "@/components/TonConnectShell";

export default function DexHubShell({ children }: { children: React.ReactNode }) {
  return (
    <TonConnectShell>
      <div className="pb-[5.25rem]">
        {children}
        <DexHubBottomNav />
      </div>
    </TonConnectShell>
  );
}
