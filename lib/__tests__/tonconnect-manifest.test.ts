import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { buildTonConnectManifest } from "@/lib/tonconnect-manifest-body";
import { resolveTonConnectOrigin } from "@/lib/tonconnect-request-origin";

describe("buildTonConnectManifest", () => {
  it("builds manifest with matching url and png icon", () => {
    const m = buildTonConnectManifest("https://pay.example.com");
    expect(m.url).toBe("https://pay.example.com");
    expect(m.iconUrl).toBe("https://pay.example.com/api/manifest/tonconnect-icon");
    expect(m.termsOfUseUrl).toContain("/clicker/terms");
    expect(m.privacyPolicyUrl).toContain("/clicker/privacy");
  });

  it("strips trailing slash from origin", () => {
    const m = buildTonConnectManifest("https://pay.example.com/");
    expect(m.url).toBe("https://pay.example.com");
  });
});

describe("resolveTonConnectOrigin", () => {
  it("uses x-forwarded-host and proto from request", () => {
    const req = new NextRequest("http://internal/api/manifest/tonconnect", {
      headers: {
        host: "internal",
        "x-forwarded-host": "pay.example.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(resolveTonConnectOrigin(req)).toBe("https://pay.example.com");
  });

  it("uses http for localhost host header", () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/manifest/tonconnect", {
      headers: { host: "localhost:3000" },
    });
    expect(resolveTonConnectOrigin(req)).toBe("http://localhost:3000");
  });
});
