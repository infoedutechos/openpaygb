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
  });

  it("returns 200 when database connects", async () => {
    vi.mocked(prisma.$connect).mockResolvedValue(undefined);
    const r = await GET(new Request("http://localhost/api/health"));
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
