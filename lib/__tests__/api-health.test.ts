import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $connect: vi.fn(),
  },
}));

import { GET } from "@/app/api/health/route";
import { prisma } from "@/lib/prisma";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("HEALTH_CHECK_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
  });

  it("returns 200 when database connects", async () => {
    vi.mocked(prisma.$connect).mockResolvedValue(undefined);
    const r = await GET(new Request("http://localhost/api/health"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, db: "connected" });
  });

  it("returns 401 when HEALTH_CHECK_SECRET is set but Authorization is missing", async () => {
    vi.stubEnv("HEALTH_CHECK_SECRET", "test-health-secret");
    vi.mocked(prisma.$connect).mockResolvedValue(undefined);
    const r = await GET(new Request("http://localhost/api/health"));
    expect(r.status).toBe(401);
  });

  it("returns 200 when HEALTH_CHECK_SECRET matches Bearer token", async () => {
    vi.stubEnv("HEALTH_CHECK_SECRET", "test-health-secret");
    vi.mocked(prisma.$connect).mockResolvedValue(undefined);
    const r = await GET(
      new Request("http://localhost/api/health", {
        headers: { Authorization: "Bearer test-health-secret" },
      }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, db: "connected" });
  });

  it("returns 503 when database connection fails", async () => {
    vi.mocked(prisma.$connect).mockRejectedValue(new Error("ECONNREFUSED"));
    const r = await GET(new Request("http://localhost/api/health"));
    expect(r.status).toBe(503);
    const j = (await r.json()) as { ok: boolean; db: string };
    expect(j.ok).toBe(false);
    expect(j.db).toMatch(/ECONNREFUSED|error|unavailable/);
  });
});
