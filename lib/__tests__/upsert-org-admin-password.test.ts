import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: vi.fn() },
    adminUser: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "hashed") },
}));

import { prisma } from "@/lib/prisma";
import { upsertOrgAdminPassword } from "@/lib/upsert-org-admin-password";

const orgFind = prisma.organization.findUnique as unknown as ReturnType<typeof vi.fn>;
const adminFind = prisma.adminUser.findUnique as unknown as ReturnType<typeof vi.fn>;
const adminCreate = prisma.adminUser.create as unknown as ReturnType<typeof vi.fn>;
const adminUpdate = prisma.adminUser.update as unknown as ReturnType<typeof vi.fn>;

describe("upsertOrgAdminPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgFind.mockResolvedValue({
      id: "org1",
      name: "Test School",
      slug: "test-school",
      tenantStatus: "active",
      registrationContactEmail: "admin@school.test",
    });
  });

  it("rejects short passwords", async () => {
    await expect(upsertOrgAdminPassword("org1", { password: "short" })).rejects.toThrow(
      /at least 10/,
    );
  });

  it("rejects template org", async () => {
    orgFind.mockResolvedValueOnce({
      id: "org0",
      name: "Default",
      slug: "default",
      tenantStatus: "active",
      registrationContactEmail: "a@b.com",
    });
    await expect(upsertOrgAdminPassword("org0", { password: "longpassword1" })).rejects.toThrow(
      /template/,
    );
  });

  it("creates org admin when missing", async () => {
    adminFind.mockResolvedValue(null);
    adminCreate.mockResolvedValue({ id: "a1", email: "admin@school.test" });
    const result = await upsertOrgAdminPassword("org1", { password: "longpassword1" });
    expect(result.created).toBe(true);
    expect(result.updated).toBe(false);
    expect(adminCreate).toHaveBeenCalled();
  });

  it("updates password when admin exists for same org", async () => {
    adminFind.mockResolvedValue({
      id: "a1",
      email: "admin@school.test",
      role: "org_admin",
      organizationId: "org1",
    });
    adminUpdate.mockResolvedValue({ id: "a1", email: "admin@school.test" });
    const result = await upsertOrgAdminPassword("org1", { password: "longpassword1" });
    expect(result.created).toBe(false);
    expect(result.updated).toBe(true);
    expect(adminUpdate).toHaveBeenCalled();
  });

  it("rejects email belonging to another org", async () => {
    adminFind.mockResolvedValue({
      id: "a1",
      email: "admin@school.test",
      role: "org_admin",
      organizationId: "other-org",
    });
    await expect(upsertOrgAdminPassword("org1", { password: "longpassword1" })).rejects.toThrow(
      /different organization/,
    );
  });
});
