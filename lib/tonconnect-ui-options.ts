import type { WalletsListConfiguration } from "@tonconnect/ui";
import { isLocalTonConnectHost, LOCAL_DEV_TON_WALLETS } from "@/lib/tonconnect-local-wallets";

export type TonConnectUiProviderExtras = {
  walletsListConfiguration?: WalletsListConfiguration;
};

export function getTonConnectUiProviderExtras(hostname?: string): TonConnectUiProviderExtras {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  if (!host || !isLocalTonConnectHost(host)) {
    return {};
  }
  return {
    walletsListConfiguration: {
      includeWallets: LOCAL_DEV_TON_WALLETS,
    },
  };
}

/** Known third-party bridge SSE failures on localhost — not app bugs. */
const THIRD_PARTY_BRIDGE_HOSTS = [
  "go-bridge.tomo.inc",
  "bridge.mirai.app",
  "nicegram.app",
  "tc.nicegram.app",
] as const;

export function isTonConnectBridgeConsoleNoise(message: string): boolean {
  const s = message.toLowerCase();
  if (THIRD_PARTY_BRIDGE_HOSTS.some((h) => s.includes(h))) {
    return true;
  }
  if (s.includes("bridge/events") || (s.includes("/bridge/") && s.includes("events"))) {
    return true;
  }
  if (s.includes("cors") && (s.includes("bridge") || THIRD_PARTY_BRIDGE_HOSTS.some((h) => s.includes(h)))) {
    return true;
  }
  if ((s.includes("522") || s.includes("err_http2_protocol_error") || s.includes("err_failed")) && s.includes("bridge")) {
    return true;
  }
  return false;
}
