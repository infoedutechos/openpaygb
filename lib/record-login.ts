import "server-only";

import { prisma } from "@/lib/prisma";

/** Shift `lastLoginAt` → `previousLoginAt` and set new `lastLoginAt` on successful sign-in. */
export async function recordAdminLogin(adminUserId: string): Promise<void> {
  const row = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { lastLoginAt: true },
  });
  if (!row) return;
  await prisma.adminUser.update({
    where: { id: adminUserId },
    data: {
      previousLoginAt: row.lastLoginAt,
      lastLoginAt: new Date(),
    },
  });
}

export async function recordStudentLogin(studentId: string): Promise<void> {
  const row = await prisma.student.findUnique({
    where: { id: studentId },
    select: { lastLoginAt: true },
  });
  if (!row) return;
  await prisma.student.update({
    where: { id: studentId },
    data: {
      previousLoginAt: row.lastLoginAt,
      lastLoginAt: new Date(),
    },
  });
}
