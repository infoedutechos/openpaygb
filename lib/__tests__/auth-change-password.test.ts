import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "127.0.0.1",
  rateLimitHit: () => false,
}));

vi.mock("@/lib/auth", () => ({
  getAdminFromCookies: vi.fn(),
}));

vi.mock("@/lib/cached-admin-profile", () => ({
  revalidateAdminProfile: vi.fn(),
}));

vi.mock("@/lib/demo-password-policy", () => ({
  enforceDemoPasswordChange: vi.fn(async () => ({
    ok: true,
    slot: null,
    policy: { lockSelfService: false, syncChangesToMac: false },
  })),
  syncDemoPasswordToMac: vi.fn(async () => undefined),
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
import { enforceDemoPasswordChange } from "@/lib/demo-password-policy";

describe("POST /api/auth/admin/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceDemoPasswordChange).mockResolvedValue({
      ok: true,
      slot: null,
      policy: { lockSelfService: false, syncChangesToMac: false },
    });
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
      email: "a@b.c",
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

  it("returns 403 when demo password lock is on", async () => {
    vi.mocked(getAdminFromCookies).mockResolvedValue({
      sub: "a1",
      email: "school.admin@odelhub.local",
      role: "org_admin",
    });
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: "a1",
      email: "school.admin@odelhub.local",
      passwordHash: await bcrypt.hash("Current123", 10),
    } as never);
    vi.mocked(enforceDemoPasswordChange).mockResolvedValue({
      ok: false,
      error: "This is a shared demo account. Password changes are locked by Master Admin — ask the platform master to update it under Demo logins.",
      status: 403,
    });
    const r = await adminChangePassword(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: "Current123", newPassword: "Newpass987" }),
      }),
    );
    expect(r.status).toBe(403);
    expect(prisma.adminUser.update).not.toHaveBeenCalled();
  });

  it("updates hash when current password matches", async () => {
    vi.mocked(getAdminFromCookies).mockResolvedValue({ sub: "a1", email: "a@b.c", role: "master" });
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: "a1",
      email: "a@b.c",
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
