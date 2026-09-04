import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultOrganizationId } from "@/lib/default-organization";

/** Programme code for developer-app OpenPayGB card holders (excluded from tuition rolls). */
export const DEVELOPER_CARD_PROGRAMME = "DEVELOPER_CARD";

/**
 * Resolve or create the shadow Student row that holds a developer app's OpenPayGB card.
 */
export async function ensureDeveloperOpenPayHolder(developerAppId: string): Promise<{
  studentId: string;
  organizationId: string;
  name: string;
  email: string;
}> {
  const app = await prisma.developerApp.findUnique({
    where: { id: developerAppId },
    select: {
      id: true,
      name: true,
      contactEmail: true,
      organizationId: true,
      openPayStudentId: true,
    },
  });
  if (!app) throw new Error("Developer app not found");

  const organizationId = app.organizationId || (await getDefaultOrganizationId());
  const email =
    app.contactEmail.trim().toLowerCase() ||
    `dev-${app.id.slice(-10)}@developers.odelhub.local`;
  const displayName = app.name.trim() || email.split("@")[0] || "Developer";

  if (app.openPayStudentId) {
    const linked = await prisma.student.findUnique({
      where: { id: app.openPayStudentId },
      select: { id: true, organizationId: true, name: true, email: true, programmeCode: true },
    });
    if (
      linked &&
      linked.organizationId === organizationId &&
      linked.programmeCode.toUpperCase() === DEVELOPER_CARD_PROGRAMME
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
      organizationId,
      programmeCode: DEVELOPER_CARD_PROGRAMME,
      OR: [
        { admissionNo: `DEV-${app.id.slice(-8).toUpperCase()}` },
        { email: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { id: true, organizationId: true, name: true, email: true },
  });

  if (!student) {
    student = await prisma.student.create({
      data: {
        organizationId,
        name: displayName,
        email,
        programmeCode: DEVELOPER_CARD_PROGRAMME,
        admissionNo: `DEV-${app.id.slice(-8).toUpperCase()}`,
        year: 1,
        semester: 1,
      },
      select: { id: true, organizationId: true, name: true, email: true },
    });
  }

  await prisma.developerApp.update({
    where: { id: app.id },
    data: { openPayStudentId: student.id },
  });

  return {
    studentId: student.id,
    organizationId: student.organizationId,
    name: student.name || displayName,
    email: student.email || email,
  };
}
