import { describe, expect, it } from "vitest";
import {
  getTonConnectUiProviderExtras,
  isTonConnectBridgeConsoleNoise,
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
});

describe("getTonConnectUiProviderExtras", () => {
  it("limits wallets on localhost", () => {
    const extras = getTonConnectUiProviderExtras("localhost");
    expect(extras.walletsListConfiguration?.includeWallets?.length).toBe(3);
  });

  it("returns empty on production host", () => {
    expect(getTonConnectUiProviderExtras("pay.odelhub.com")).toEqual({});
  });
});
