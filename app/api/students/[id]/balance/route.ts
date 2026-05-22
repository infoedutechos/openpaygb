import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { serializeStudentBalance } from "@/lib/tuition-balance-json";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  const student = await prisma.student.findFirst({
    where: { id, ...orgWhere },
    select: {
      id: true,
      organizationId: true,
      programmeCode: true,
      year: true,
      semester: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
