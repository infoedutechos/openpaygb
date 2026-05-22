import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentFromCookies } from "@/lib/student-auth";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { serializeStudentBalance } from "@/lib/tuition-balance-json";

export async function GET() {
  const session = await getStudentFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      organizationId: true,
      programmeCode: true,
      year: true,
      semester: true,
    },
  });

  if (!student || student.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getStudentBalanceSummary({
    studentId: student.id,
    organizationId: student.organizationId,
    programmeCode: student.programmeCode,
    year: student.year,
    semester: student.semester,
  });

  if (!summary) {
    return NextResponse.json({ balance: null });
  }

  return NextResponse.json({ balance: serializeStudentBalance(summary) });
}
