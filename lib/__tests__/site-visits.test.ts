import { describe, expect, it } from "vitest";
import { countryDisplayName, utcDayKey, visitGeoFromHeaders } from "@/lib/visit-geo";
import { hashVisitorId } from "@/lib/visit-id";

describe("visit-geo", () => {
  it("reads Vercel country and city headers", () => {
    const h = new Headers({
      "x-vercel-ip-country": "ug",
      "x-vercel-ip-city": "Kampala",
    });
    expect(visitGeoFromHeaders(h)).toEqual({ countryCode: "UG", location: "Kampala" });
  });

  it("falls back to Cloudflare and unknown", () => {
    expect(visitGeoFromHeaders(new Headers({ "cf-ipcountry": "KE" })).countryCode).toBe("KE");
    expect(visitGeoFromHeaders(new Headers()).countryCode).toBe("XX");
  });

  it("maps country display names", () => {
    expect(countryDisplayName("UG")).toBe("Uganda");
    expect(countryDisplayName("XX")).toBe("Unknown");
  });

  it("utc day key is YYYY-MM-DD", () => {
    expect(utcDayKey(new Date("2026-07-18T12:00:00.000Z"))).toBe("2026-07-18");
  });
});

describe("no raw IP persistence", () => {
  it("hashes visitor ids and IP-derived rate keys so plaintext never matches", () => {
    const cookieHash = hashVisitorId("abc-123");
    const ipRateHash = hashVisitorId("ip:203.0.113.10");
    expect(cookieHash).toHaveLength(64);
    expect(ipRateHash).toHaveLength(64);
    expect(cookieHash).not.toContain("abc");
    expect(ipRateHash).not.toContain("203.0.113.10");
    expect(ipRateHash).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});
