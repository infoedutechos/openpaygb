import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { verifyAdminSessionTokenEdge } from "@/lib/admin-session-edge";

describe("admin-session-edge", () => {
  it("accepts tokens signed with Node crypto (same as utils/admin-session)", async () => {
    process.env.ADMIN_PASSWORD = "test-shell-password";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = `${exp}.admin`;
    const sig = createHmac("sha256", process.env.ADMIN_PASSWORD).update(payload).digest("base64url");
    const token = `${exp}.${sig}`;
    await expect(verifyAdminSessionTokenEdge(token)).resolves.toBe(true);
    await expect(verifyAdminSessionTokenEdge(`${exp}.bad`)).resolves.toBe(false);
  });
});
