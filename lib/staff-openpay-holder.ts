import "server-only";

import { prisma } from "@/lib/prisma";

/** Programme code for staff personal OpenPayGB card holders (excluded from tuition rolls). */
export const STAFF_CARD_PROGRAMME = "STAFF_CARD";

/**
 * Resolve or create the shadow Student row that holds a staff member's OpenPayGB card.
 */
export async function ensureStaffOpenPayHolder(staffId: string): Promise<{
  studentId: string;
  organizationId: string;
  name: string;
  email: string;
}> {
  const staff = await prisma.schoolStaff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      name: true,
      email: true,
      staffCode: true,
      organizationId: true,
      openPayStudentId: true,
    },
  });
  if (!staff) throw new Error("Staff not found");

  const email =
    staff.email.trim().toLowerCase() ||
    `staff-${staff.id.slice(-10)}@staff.odelhub.local`;
  const displayName = staff.name.trim() || staff.staffCode || "Staff";

  if (staff.openPayStudentId) {
    const linked = await prisma.student.findUnique({
      where: { id: staff.openPayStudentId },
      select: { id: true, organizationId: true, name: true, email: true, programmeCode: true },
    });
    if (
      linked &&
      linked.organizationId === staff.organizationId &&
      linked.programmeCode.toUpperCase() === STAFF_CARD_PROGRAMME
    ) {
      return {
        studentId: linked.id,
        organizationId: linked.organizationId,
        name: linked.name || displayName,
        email: linked.email || email,
      };
    }
  }

  let student = await prisma.student.findFirst({
    where: {
      organizationId: staff.organizationId,
      programmeCode: STAFF_CARD_PROGRAMME,
      OR: [
        { admissionNo: `STAFF-${staff.id.slice(-8).toUpperCase()}` },
        ...(staff.email.trim()
          ? [{ email: { equals: staff.email.trim(), mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: { id: true, organizationId: true, name: true, email: true },
  });

  if (!student) {
    student = await prisma.student.create({
      data: {
        organizationId: staff.organizationId,
        name: displayName,
        email,
        programmeCode: STAFF_CARD_PROGRAMME,
        admissionNo: `STAFF-${staff.id.slice(-8).toUpperCase()}`,
        year: 1,
        semester: 1,
      },
      select: { id: true, organizationId: true, name: true, email: true },
    });
  }

  await prisma.schoolStaff.update({
    where: { id: staff.id },
    data: { openPayStudentId: student.id },
  });

  return {
    studentId: student.id,
    organizationId: student.organizationId,
    name: student.name || displayName,
    email: student.email || email,
  };
}
