import { describe, expect, it } from "vitest";
import { getBundledTonWalletsListUrl } from "@/lib/tonconnect-connector";

describe("getBundledTonWalletsListUrl", () => {
  it("points to same-origin bundled wallets list", () => {
    expect(getBundledTonWalletsListUrl("https://pay.example.com")).toBe(
      "https://pay.example.com/tonconnect/wallets-v2.json",
    );
  });

  it("strips trailing slash from origin", () => {
    expect(getBundledTonWalletsListUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000/tonconnect/wallets-v2.json",
    );
  });
});
