import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentFromCookies } from "@/lib/student-auth";

export async function GET() {
  const session = await getStudentFromCookies();
  if (!session) {
    return NextResponse.json({ student: null }, { status: 401 });
  }

  const row = await prisma.student.findUnique({
    where: { id: session.sub },
    include: {
      organization: { select: { name: true, slug: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          status: true,
          tonAmount: true,
          totalUgx: true,
          txHash: true,
          createdAt: true,
          confirmedAt: true,
          programmeCode: true,
          year: true,
          semester: true,
          rail: true,
        },
      },
    },
  });

  if (!row || row.organizationId !== session.organizationId) {
    return NextResponse.json({ student: null }, { status: 401 });
  }

  return NextResponse.json({
    student: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? "",
      programmeCode: row.programmeCode,
      year: row.year,
      semester: row.semester,
      organizationName: row.organization.name,
      organizationSlug: row.organization.slug,
      portalSignInEnabled: Boolean(row.portalPasswordHash),
      payments: row.payments,
    },
  });
}
