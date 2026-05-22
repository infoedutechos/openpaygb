import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";

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
    include: { organization: { select: { slug: true, name: true } } },
  });
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const payments = await prisma.payment.findMany({
    where: { studentId: id, ...orgWhere },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      telegramId: student.telegramId,
      programmeCode: student.programmeCode,
      year: student.year,
      semester: student.semester,
      createdAt: student.createdAt,
      organizationSlug: student.organization.slug,
      organizationName: student.organization.name,
    },
    payments: payments.map((p) => ({
      id: p.id,
      status: p.status,
      totalUgx: p.totalUgx,
      tonAmount: p.tonAmount,
      txHash: p.txHash,
      rail: p.rail,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt,
    })),
  });
}
