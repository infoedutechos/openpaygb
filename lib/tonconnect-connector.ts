import { TonConnect } from "@tonconnect/sdk";

/** Same-origin wallets list — avoids remote config.ton.org fetch failures in PWA / offline. */
export function getBundledTonWalletsListUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/tonconnect/wallets-v2.json`;
}

export function createTonConnectConnector(manifestUrl: string, origin?: string): TonConnect {
  return new TonConnect({
    manifestUrl,
    walletsListSource: getBundledTonWalletsListUrl(origin),
    analytics: { mode: "off" },
  });
}
