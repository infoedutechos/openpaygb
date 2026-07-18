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

describe("site-visits helpers", () => {
  it("hashes visitor ids stably without exposing raw cookie", () => {
    const a = hashVisitorId("abc-123");
    const b = hashVisitorId("abc-123");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).not.toContain("abc");
  });
});
