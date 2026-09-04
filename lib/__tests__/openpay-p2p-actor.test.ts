import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/student-auth", () => ({
  getStudentFromCookies: vi.fn(),
}));
vi.mock("@/lib/admin-openpay-api", () => ({
  requireAdminOpenPayHolder: vi.fn(),
}));
vi.mock("@/lib/staff-openpay-api", () => ({
  requireStaffOpenPayHolder: vi.fn(),
}));
vi.mock("@/lib/developer-openpay-api", () => ({
  requireDeveloperOpenPayHolder: vi.fn(),
}));

import { getStudentFromCookies } from "@/lib/student-auth";
import { requireAdminOpenPayHolder } from "@/lib/admin-openpay-api";
import { requireStaffOpenPayHolder } from "@/lib/staff-openpay-api";
import { requireDeveloperOpenPayHolder } from "@/lib/developer-openpay-api";
import { resolveOpenPayP2pActor } from "@/lib/openpay-p2p-actor";

describe("resolveOpenPayP2pActor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudentFromCookies).mockResolvedValue(null);
    vi.mocked(requireAdminOpenPayHolder).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    } as never);
    vi.mocked(requireStaffOpenPayHolder).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    } as never);
    vi.mocked(requireDeveloperOpenPayHolder).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Developer sign-in required",
    } as never);
  });

  it("prefers student session", async () => {
    vi.mocked(getStudentFromCookies).mockResolvedValue({
      sub: "stu1",
      organizationId: "org1",
    } as never);
    const r = await resolveOpenPayP2pActor();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.actor.kind).toBe("student");
      expect(r.actor.studentId).toBe("stu1");
    }
  });

  it("falls back to admin OpenPay holder", async () => {
    vi.mocked(requireAdminOpenPayHolder).mockResolvedValue({
      ok: true,
      session: {},
      holder: { studentId: "admin-stu", organizationId: "org1", name: "A", email: "a@x" },
    } as never);
    const r = await resolveOpenPayP2pActor();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.actor.kind).toBe("admin");
  });

  it("returns 401 when nobody is signed in", async () => {
    const r = await resolveOpenPayP2pActor();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });
});
