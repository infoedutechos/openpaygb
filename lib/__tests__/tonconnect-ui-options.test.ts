import { describe, expect, it } from "vitest";
import {
  getTonConnectUiProviderExtras,
  isTonConnectAnalyticsNoise,
  isTonConnectBridgeConsoleNoise,
  isTonConnectWalletsListFetchNoise,
} from "@/lib/tonconnect-ui-options";

describe("isTonConnectBridgeConsoleNoise", () => {
  it("detects third-party bridge failures", () => {
    expect(
      isTonConnectBridgeConsoleNoise(
        "Access to resource at 'https://go-bridge.tomo.inc/bridge/events?client_id=abc' blocked by CORS",
      ),
    ).toBe(true);
    expect(
      isTonConnectBridgeConsoleNoise("GET https://bridge.mirai.app/events 522"),
    ).toBe(true);
    expect(
      isTonConnectBridgeConsoleNoise(
        "GET https://tc.nicegram.app/bridge/events net::ERR_HTTP2_PROTOCOL_ERROR 200",
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isTonConnectBridgeConsoleNoise("Failed to fetch /api/user")).toBe(false);
  });

  it("detects CORS lines without bridge keyword", () => {
    expect(
      isTonConnectBridgeConsoleNoise(
        "Access to resource at 'https://go-bridge.tomo.inc/bridge/events?client_id=abc' from origin 'http://localhost:3000' has been blocked by CORS policy",
      ),
    ).toBe(true);
  });

  it("detects wallets list CDN failures in console text", () => {
    expect(
      isTonConnectBridgeConsoleNoise(
        "Failed to fetch https://config.ton.org/wallets-v2.json",
      ),
    ).toBe(true);
  });
});

describe("isTonConnectWalletsListFetchNoise", () => {
  it("detects wallets list fetch rejections from TonConnect SDK", () => {
    const err = new TypeError("Failed to fetch");
    err.stack =
      "TypeError: Failed to fetch\n    at WalletsListManager.fetchWalletsListFromSource";
    expect(isTonConnectWalletsListFetchNoise(err)).toBe(true);
  });

  it("ignores unrelated fetch failures", () => {
    const err = new TypeError("Failed to fetch");
    err.stack = "TypeError: Failed to fetch\n    at loadUser (/app/api/user)";
    expect(isTonConnectWalletsListFetchNoise(err)).toBe(false);
  });
});

describe("isTonConnectAnalyticsNoise", () => {
  it("detects analytics API failures", () => {
    const err = new Error("[TON_CONNECT_SDK_ERROR] TonConnectError\nAnalytics API error: 400");
    expect(isTonConnectAnalyticsNoise(err)).toBe(true);
  });
});

describe("getTonConnectUiProviderExtras", () => {
  it("bundles wallets for connect modal", () => {
    const extras = getTonConnectUiProviderExtras();
    expect(extras.walletsListConfiguration?.includeWallets?.length).toBe(3);
    expect(extras.analytics?.mode).toBe("off");
  });
});
