import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "127.0.0.1",
  rateLimitHit: () => false,
}));

vi.mock("@/lib/auth", () => ({
  getAdminFromCookies: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST as adminChangePassword } from "@/app/api/auth/admin/change-password/route";
import { getAdminFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/admin/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getAdminFromCookies).mockResolvedValue(null);
    const r = await adminChangePassword(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: "oldpass1234", newPassword: "newpass9876" }),
      })
    );
    expect(r.status).toBe(401);
  });

  it("returns 401 when current password wrong", async () => {
    vi.mocked(getAdminFromCookies).mockResolvedValue({ sub: "a1", email: "a@b.c", role: "org_admin" });
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: "a1",
      passwordHash: await bcrypt.hash("correct-old", 10),
    } as never);
    const r = await adminChangePassword(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: "wrong", newPassword: "newpass9876" }),
      })
    );
    expect(r.status).toBe(401);
  });

  it("updates hash when current password matches", async () => {
    vi.mocked(getAdminFromCookies).mockResolvedValue({ sub: "a1", email: "a@b.c", role: "master" });
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: "a1",
      passwordHash: await bcrypt.hash("Current123", 10),
    } as never);
    vi.mocked(prisma.adminUser.update).mockResolvedValue({} as never);
    const r = await adminChangePassword(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: "Current123", newPassword: "Newpass987" }),
      })
    );
    expect(r.status).toBe(200);
    expect(prisma.adminUser.update).toHaveBeenCalled();
  });
});
