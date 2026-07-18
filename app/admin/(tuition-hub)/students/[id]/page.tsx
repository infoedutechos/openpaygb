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
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { ensureSchoolPayCode } from "@/lib/school-pay-code";
import { appBaseUrl } from "@/lib/root-metadata";
import { studentCardPath } from "@/lib/admission-no";

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
      include: {
        organization: {
          select: { id: true, slug: true, name: true, institutionTier: true },
        },
      },
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

  const [openPayCardSettings, openPayCardResult, schoolPayCode] = await Promise.all([
    getOpenPayCardPlatformSettings(),
    tryServerDb(() =>
      prisma.openPayCard.findUnique({
        where: { studentId: id },
        include: { _count: { select: { topups: true } } },
      }),
    ),
    ensureSchoolPayCode(student.organizationId),
  ]);

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

  const cardUrl = `${appBaseUrl()}${studentCardPath(student.id)}`;
  const periodLabel = student.organization.institutionTier === "school" ? "Term" : "Semester";

  return (
    <StudentDetailView
      student={{
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNo,
        email: student.email,
        phone: student.phone,
        programmeCode: student.programmeCode,
        year: student.year,
        semester: student.semester,
        organizationName: student.organization.name,
        organizationSlug: student.organization.slug,
        schoolPayCode,
        cardUrl,
        periodLabel,
        portalSignInEnabled: Boolean(student.portalPasswordHash),
      }}
      totalTon={totalTon}
      totalUgx={totalUgx}
      payments={paymentRows}
      balance={balance}
      openPayCardEnabled={openPayCardSettings.enabled}
      openPayCard={
        openPayCardResult.ok && openPayCardResult.data
          ? {
              status: openPayCardResult.data.status,
              maskedPan: openPayCardResult.data.maskedPan,
              balanceUgx: openPayCardResult.data.balanceUgx,
              issuedAt: openPayCardResult.data.issuedAt?.toISOString() ?? null,
              topupCount: openPayCardResult.data._count.topups,
            }
          : null
      }
    />
  );
}
