import { describe, expect, it } from "vitest";
import {
  STANDALONE_APP_IDS,
  STANDALONE_APPS,
  hostMatchesPattern,
  isPathAllowedForStandalone,
  parseStandaloneAppId,
  resolveStandaloneApp,
  standaloneAppById,
} from "@/lib/standalone-apps";

describe("standalone-apps", () => {
  it("registers all six product surfaces", () => {
    expect(STANDALONE_APP_IDS).toEqual([
      "odelpay_universities",
      "odelpay_schools",
      "openpaygb",
      "dex",
      "play",
      "odelhub_devs",
    ]);
    expect(STANDALONE_APPS).toHaveLength(6);
  });

  it("matches host patterns including wildcards", () => {
    expect(hostMatchesPattern("universities.odelpay.vercel.app", "universities.odelpay.vercel.app")).toBe(true);
    expect(hostMatchesPattern("universities.odelpay.com", "*.odelpay.com")).toBe(true);
    expect(hostMatchesPattern("odelpay.vercel.app", "universities.odelpay.vercel.app")).toBe(false);
  });

  it("resolves from STANDALONE_APP env before host", () => {
    const fromEnv = resolveStandaloneApp({
      host: "play.odelpay.vercel.app",
      env: { STANDALONE_APP: "dex", NODE_ENV: "test" },
    });
    expect(fromEnv?.id).toBe("dex");

    const fromHost = resolveStandaloneApp({ host: "play.odelpay.vercel.app" });
    expect(fromHost?.id).toBe("play");
  });

  it("parses valid env ids only", () => {
    expect(parseStandaloneAppId("play")).toBe("play");
    expect(parseStandaloneAppId("odelhub_devs")).toBe("odelhub_devs");
    expect(parseStandaloneAppId("developers")).toBeNull();
  });

  it("allows tuition flows for universities standalone", () => {
    const app = standaloneAppById("odelpay_universities");
    expect(isPathAllowedForStandalone("/OdelPayUniversities", app)).toBe(true);
    expect(isPathAllowedForStandalone("/pay/demo-org", app)).toBe(true);
    expect(isPathAllowedForStandalone("/clicker", app)).toBe(false);
    expect(isPathAllowedForStandalone("/api/health", app)).toBe(true);
  });

  it("allows clicker-only paths for play standalone", () => {
    const app = standaloneAppById("play");
    expect(isPathAllowedForStandalone("/clicker", app)).toBe(true);
    expect(isPathAllowedForStandalone("/clicker/mini", app)).toBe(true);
    expect(isPathAllowedForStandalone("/dex", app)).toBe(false);
  });

  it("allows developer portal paths for odelhub_devs standalone", () => {
    const app = standaloneAppById("odelhub_devs");
    expect(isPathAllowedForStandalone("/developers", app)).toBe(true);
    expect(isPathAllowedForStandalone("/developers/dashboard", app)).toBe(true);
    expect(isPathAllowedForStandalone("/docs", app)).toBe(true);
    expect(isPathAllowedForStandalone("/login", app)).toBe(true);
    expect(isPathAllowedForStandalone("/student/login", app)).toBe(true);
    expect(isPathAllowedForStandalone("/staff/login", app)).toBe(true);
    expect(isPathAllowedForStandalone("/admin/login", app)).toBe(true);
    expect(isPathAllowedForStandalone("/clicker", app)).toBe(false);
  });
});
