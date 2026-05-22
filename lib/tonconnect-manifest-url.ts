import { resolveClientTonConnectOrigin } from "@/lib/tonconnect-request-origin";

/** TON Connect manifest served by this app (must match the mini-app / site origin). */
export function getTonConnectManifestUrl(origin?: string): string {
  const base = (origin ?? resolveClientTonConnectOrigin()).replace(/\/$/, "");
  if (base) return `${base}/api/manifest/tonconnect`;
  return "/api/manifest/tonconnect";
}
