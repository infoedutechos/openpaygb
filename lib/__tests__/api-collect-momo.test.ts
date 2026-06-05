import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/collect/momo/route";

describe("POST /api/collect/momo", () => {
  it("returns 410 deprecated", async () => {
    const r = await POST();
    expect(r.status).toBe(410);
    const j = (await r.json()) as { code?: string };
    expect(j.code).toBe("deprecated_collect");
  });
});
