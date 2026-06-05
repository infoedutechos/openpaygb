import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";
import { StudentDetailView } from "@/components/admin/StudentDetailView";
import { ServerDbUnavailable } from "@/components/ui/ServerDbUnavailable";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { serializeStudentBalance } from "@/lib/tuition-balance-json";
import { tryServerDb } from "@/lib/run-server-db";

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminFromCookies();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return <p className="text-sm text-rose-600">Invalid student id</p>;
  }
  const orgWhere = await organizationWhereForSession(session.sub, session.role);
  const studentResult = await tryServerDb(() =>
    prisma.student.findFirst({
      where: { id, ...orgWhere },
      include: { organization: { select: { slug: true, name: true } } },
    }),
  );
  if (!studentResult.ok) {
    return <ServerDbUnavailable title="Student record unavailable" />;
  }
  const student = studentResult.data;
  if (!student) {
    return <p className="text-sm text-rose-600">Student not found</p>;
  }
  const paymentsResult = await tryServerDb(() =>
    prisma.payment.findMany({
      where: { studentId: id, ...orgWhere },
      orderBy: { createdAt: "desc" },
    }),
  );
  if (!paymentsResult.ok) {
    return <ServerDbUnavailable title="Payment history unavailable" />;
  }
  const payments = paymentsResult.data;
  const aggResult = await tryServerDb(() =>
    prisma.payment.aggregate({
      where: { studentId: id, status: "confirmed", ...orgWhere },
      _sum: { tonAmount: true, totalUgx: true },
    }),
  );
  if (!aggResult.ok) {
    return <ServerDbUnavailable title="Payment totals unavailable" />;
  }
  const agg = aggResult.data;
  const totalTon = agg._sum.tonAmount ?? 0;
  const totalUgx = agg._sum.totalUgx ?? 0;

  const balanceSummary = await getStudentBalanceSummary({
    studentId: student.id,
    organizationId: student.organizationId,
    programmeCode: student.programmeCode,
    year: student.year,
    semester: student.semester,
  });
  const balance = balanceSummary ? serializeStudentBalance(balanceSummary) : null;

  const paymentRows = payments.map((p) => ({
    id: p.id,
    status: p.status,
    programmeCode: p.programmeCode,
    year: p.year,
    semester: p.semester,
    feeSelectionMode: p.feeSelectionMode,
    totalUgx: p.totalUgx,
    tonAmount: p.tonAmount,
    txHash: p.txHash,
    createdAt: p.createdAt.toISOString(),
    confirmedAt: p.confirmedAt?.toISOString() ?? null,
  }));

  return (
    <StudentDetailView
      student={{
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        programmeCode: student.programmeCode,
        year: student.year,
        semester: student.semester,
        organizationName: student.organization.name,
        organizationSlug: student.organization.slug,
        portalSignInEnabled: Boolean(student.portalPasswordHash),
      }}
      totalTon={totalTon}
      totalUgx={totalUgx}
      payments={paymentRows}
      balance={balance}
    />
  );
}
