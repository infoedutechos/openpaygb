import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("middleware edge imports", () => {
  it("uses Edge-safe admin session verifier only", () => {
    const src = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
    expect(src).toMatch(/admin-session-edge/);
    expect(src).not.toMatch(/utils\/admin-session/);
    expect(src).not.toMatch(/@\/utils\/admin-session/);
    expect(src).toMatch(/standalone-apps/);
  });
});
