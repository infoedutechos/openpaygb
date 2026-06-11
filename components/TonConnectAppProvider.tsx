"use client";

import { TonConnectShell } from "@/components/TonConnectShell";
import { DevNetworkFetchGuard } from "@/components/DevNetworkFetchGuard";

/** App-wide TonConnect + toast shell (manifest help is route-specific). */
export function TonConnectAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <TonConnectShell showManifestHelp={false}>
      <DevNetworkFetchGuard />
      {children}
    </TonConnectShell>
  );
}
