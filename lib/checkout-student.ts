import { prisma } from "@/lib/prisma";

export async function upsertCheckoutStudent(opts: {
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  programmeCode: string;
  year: number;
  semester: number;
}): Promise<{ student: Awaited<ReturnType<typeof prisma.student.create>>; created: boolean }> {
  const email = (opts.email ?? "").trim().toLowerCase();
  const phone = (opts.phone ?? "").trim();
  const programmeCode = opts.programmeCode.trim().toUpperCase();
  const name = opts.name.trim();

  if (email) {
    const existing = await prisma.student.findFirst({
      where: {
        organizationId: opts.organizationId,
        email: { equals: email, mode: "insensitive" },
      },
    });
    if (existing) {
      const student = await prisma.student.update({
        where: { id: existing.id },
        data: {
          name,
          programmeCode,
          year: opts.year,
          semester: opts.semester,
          ...(phone ? { phone } : {}),
        },
      });
      return { student, created: false };
    }
  }

  const student = await prisma.student.create({
    data: {
      organizationId: opts.organizationId,
      name,
      email,
      phone,
      programmeCode,
      year: opts.year,
      semester: opts.semester,
    },
  });
  return { student, created: true };
}
