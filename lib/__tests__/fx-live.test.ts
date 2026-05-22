import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLiveFxCache, fetchLiveUgxPerTon, getCachedLiveUgxPerTon } from "@/lib/fx-live";

describe("fx-live", () => {
  afterEach(() => {
    clearLiveFxCache();
    vi.unstubAllGlobals();
    delete process.env.FX_LIVE_ENABLED;
    delete process.env.FX_CACHE_TTL_SECONDS;
  });

  it("returns CoinGecko direct UGX rate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("coingecko") && String(url).includes("ugx")) {
          return new Response(JSON.stringify({ "the-open-network": { ugx: 312_450.7 } }), {
            status: 200,
          });
        }
        return new Response("{}", { status: 404 });
      }),
    );
    const r = await fetchLiveUgxPerTon();
    expect(r?.ugxPerTon).toBe(312_451);
    expect(r?.source).toBe("coingecko");
  });

  it("uses CryptoCompare when CoinGecko direct fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes("cryptocompare") && u.includes("UGX")) {
          return new Response(JSON.stringify({ UGX: 280_000 }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );
    const r = await fetchLiveUgxPerTon();
    expect(r?.ugxPerTon).toBe(280_000);
    expect(r?.source).toBe("cryptocompare");
  });

  it("falls back to USD cross when direct pairs missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes("coingecko") && u.includes("usd")) {
          return new Response(JSON.stringify({ "the-open-network": { usd: 5.2 } }), { status: 200 });
        }
        if (u.includes("open.er-api.com")) {
          return new Response(JSON.stringify({ result: "success", rates: { UGX: 3800 } }), {
            status: 200,
          });
        }
        return new Response("{}", { status: 404 });
      }),
    );
    const r = await fetchLiveUgxPerTon();
    expect(r?.ugxPerTon).toBe(19_760);
    expect(r?.source).toBe("coingecko_usd_ugx");
  });

  it("median when multiple providers agree", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes("coingecko") && u.includes("ugx")) {
          return new Response(JSON.stringify({ "the-open-network": { ugx: 300_000 } }), { status: 200 });
        }
        if (u.includes("cryptocompare") && u.includes("UGX")) {
          return new Response(JSON.stringify({ UGX: 302_000 }), { status: 200 });
        }
        if (u.includes("tonapi.io") && u.includes("ugx")) {
          return new Response(
            JSON.stringify({ rates: { TON: { prices: { UGX: 301_000 } } } }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );
    const r = await fetchLiveUgxPerTon();
    expect(r?.ugxPerTon).toBe(301_000);
    expect(r?.source).toBe("market_median_3");
  });

  it("caches live rate within TTL", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("coingecko") && String(url).includes("ugx")) {
        return new Response(JSON.stringify({ "the-open-network": { ugx: 300_000 } }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    process.env.FX_CACHE_TTL_SECONDS = "600";
    const a = await getCachedLiveUgxPerTon();
    const b = await getCachedLiveUgxPerTon();
    expect(a?.ugxPerTon).toBe(300_000);
    expect(b?.ugxPerTon).toBe(300_000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    const callsAfterFirst = fetchMock.mock.calls.length;
    await getCachedLiveUgxPerTon();
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });
});
