import { describe, expect, it } from "vitest";
import { readJsonResponse } from "@/utils/read-json-response";

describe("readJsonResponse", () => {
  it("handles empty body without throwing", async () => {
    const res = new Response("", { status: 500 });
    const out = await readJsonResponse(res);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain("empty");
  });

  it("detects HTML error pages", async () => {
    const res = new Response("<!DOCTYPE html><html><body>Error</body></html>", { status: 500 });
    const out = await readJsonResponse(res);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/Server error \(500\)/i);
  });

  it("parses valid JSON", async () => {
    const res = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const out = await readJsonResponse<{ ok: boolean }>(res);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.data.ok).toBe(true);
  });
});
