import type { AnalyticsSettings, WalletsListConfiguration } from "@tonconnect/ui";
import { BUNDLED_TON_WALLETS } from "@/lib/tonconnect-local-wallets";

export type TonConnectUiProviderExtras = {
  walletsListConfiguration?: WalletsListConfiguration;
  analytics?: AnalyticsSettings;
};

/** Bundled wallets on every host — avoids remote wallets-list fetch (offline / PWA failures). */
export function getTonConnectUiProviderExtras(): TonConnectUiProviderExtras {
  return {
    walletsListConfiguration: {
      includeWallets: BUNDLED_TON_WALLETS,
    },
    analytics: { mode: "off" },
  };
}

/** Known third-party bridge SSE failures on localhost — not app bugs. */
const THIRD_PARTY_BRIDGE_HOSTS = [
  "go-bridge.tomo.inc",
  "bridge.mirai.app",
  "nicegram.app",
  "tc.nicegram.app",
] as const;

const WALLETS_LIST_FETCH_MARKERS = [
  "walletslistmanager",
  "fetchwalletslistfromsource",
  "fetchwalletslistdto",
  "wallets-v2.json",
  "wallets-list",
  "config.ton.org",
] as const;

function stackText(reason: unknown): string {
  if (!reason || typeof reason !== "object") return "";
  const stack = (reason as { stack?: string }).stack;
  return typeof stack === "string" ? stack.toLowerCase() : "";
}

/** Remote wallets-list fetch failures when the SDK still probes config.ton.org / GitHub. */
export function isTonConnectWalletsListFetchNoise(reason: unknown): boolean {
  const msg = String(
    (reason instanceof Error ? reason.message : reason) ?? "",
  ).toLowerCase();
  if (!msg.includes("failed to fetch")) return false;
  const stack = stackText(reason);
  const haystack = stack || msg;
  return WALLETS_LIST_FETCH_MARKERS.some((m) => haystack.includes(m));
}

/** TonConnect SDK telemetry / analytics chatter (400s on localhost are harmless). */
export function isTonConnectAnalyticsNoise(reason: unknown): boolean {
  const msg = String(
    (reason instanceof Error ? reason.message : reason) ?? "",
  ).toLowerCase();
  const stack = stackText(reason);
  const haystack = `${msg} ${stack}`;
  return (
    haystack.includes("failed to send analytics events") ||
    haystack.includes("analytics api error") ||
    haystack.includes("analytics-manager") ||
    (haystack.includes("ton_connect_sdk_error") && haystack.includes("analytics"))
  );
}

/**
 * Benign aborts from Firefox (`NS_ERROR_ABORT`) / AbortController when TonConnect
 * cancels in-flight bridge, wallets-list, or restoreConnection requests on remount/HMR.
 */
export function isTonConnectAbortNoise(reason: unknown): boolean {
  if (reason == null) return false;

  const name =
    typeof reason === "object" && reason !== null && "name" in reason
      ? String((reason as { name?: unknown }).name ?? "")
      : "";
  const msg = String(
    (reason instanceof Error ? reason.message : reason) ?? "",
  );
  const stack = stackText(reason);
  const haystack = `${name} ${msg} ${stack}`.toLowerCase();

  const looksAbort =
    name === "AbortError" ||
    haystack.includes("ns_error_abort") ||
    haystack.includes("aborterror") ||
    haystack.includes("operation aborted") ||
    haystack.includes("the operation was aborted") ||
    haystack.includes("signal is aborted") ||
    haystack.includes("request was aborted");

  if (!looksAbort) return false;

  // Prefer suppressing when stack is TonConnect-related; also suppress bare
  // Firefox NS_ERROR_ABORT / AbortError during app shell boot (common on layout remount).
  return (
    haystack.includes("tonconnect") ||
    haystack.includes("ton-connect") ||
    haystack.includes("@tonconnect") ||
    haystack.includes("ns_error_abort") ||
    name === "AbortError"
  );
}

export function isTonConnectBridgeConsoleNoise(message: string): boolean {
  const s = message.toLowerCase();
  if (s.includes("[ton_connect_sdk]")) {
    return true;
  }
  if (
    s.includes("failed to send analytics events") ||
    s.includes("analytics api error") ||
    s.includes("analytics-manager")
  ) {
    return true;
  }
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
  if (
    s.includes("failed to fetch") &&
    WALLETS_LIST_FETCH_MARKERS.some((m) => s.includes(m))
  ) {
    return true;
  }
  return false;
}

/** Next.js dev-only HMR / Fast Refresh chatter — harmless during reload. */
export function isNextDevConsoleNoise(message: string): boolean {
  const s = message.toLowerCase();
  return (
    s.includes("[fast refresh]") ||
    s.includes("webpack-hmr") ||
    s.includes("_next/webpack-hmr") ||
    (s.includes("connection to ws://") && s.includes("was interrupted")) ||
    s.includes("ns_binding_aborted") ||
    s.includes("ns_error_abort") ||
    s.includes("opaqueresponseblocking")
  );
}
