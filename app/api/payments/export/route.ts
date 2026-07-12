import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { buildStudentProgrammeProgress } from "@/lib/tuition-progress";
import type { Payment, Programme, ProgrammeFee } from "@prisma/client";

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationSlug = url.searchParams.get("organizationSlug")?.trim().toLowerCase() ?? "";

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);

  let tenantFilter: { organizationId: string } | Record<string, never> = {};
  if (organizationSlug) {
    if (admin.role !== "master") {
      return NextResponse.json(
        { error: "organizationSlug filter is only available to platform masters" },
        { status: 403 }
      );
    }
    const org = await prisma.organization.findFirst({
      where: { slug: organizationSlug },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Unknown organization slug" }, { status: 400 });
    }
    tenantFilter = { organizationId: org.id };
  }

  const rows = await prisma.payment.findMany({
    where: { ...orgWhere, ...tenantFilter },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      student: {
        select: {
          name: true,
          email: true,
          schoolClass: { select: { code: true } },
        },
      },
      organization: { select: { slug: true, name: true } },
    },
  });

  /** Batch-load programmes and per-student payments so duration + progress columns can be filled in without N+1 queries. */
  const programmeKeys = Array.from(
    new Map(rows.map((r) => [`${r.organizationId}::${r.programmeCode}`, { organizationId: r.organizationId, code: r.programmeCode }])).values(),
  );
  const programmes = programmeKeys.length
    ? await prisma.programme.findMany({ where: { OR: programmeKeys }, include: { fees: true } })
    : [];
  const programmeByKey = new Map<string, Programme & { fees: ProgrammeFee[] }>(
    programmes.map((p) => [`${p.organizationId}::${p.code}`, p]),
  );

  const studentKeys = Array.from(
    new Map(
      rows.map((r) => [
        `${r.studentId}::${r.programmeCode}`,
        { studentId: r.studentId, programmeCode: r.programmeCode, organizationId: r.organizationId },
      ]),
    ).values(),
  );
  const studentPayments = studentKeys.length ? await prisma.payment.findMany({ where: { OR: studentKeys } }) : [];
  const paymentsByStudentProg = new Map<string, Payment[]>();
  for (const sp of studentPayments) {
    const key = `${sp.studentId}::${sp.programmeCode}`;
    paymentsByStudentProg.set(key, [...(paymentsByStudentProg.get(key) ?? []), sp]);
  }

  const header = [
    "organizationSlug",
    "organizationName",
    "id",
    "studentName",
    "studentEmail",
    "programmeCode",
    "programmeName",
    "year",
    "semester",
    "schoolReceiptNo",
    "paymentMode",
    "schoolClassCode",
    "totalUgx",
    "tonAmount",
    "status",
    "txHash",
    "rail",
    "momoReference",
    "createdAt",
    "confirmedAt",
    "feeSelectionMode",
    "includedFeeIds",
    "tuitionUgx",
    "functionalFeesUgx",
    "platformFeeUgx",
    "programmeDurationYears",
    "programmeSemestersPerYear",
    "programmeTotalSemesters",
    "programmeDurationSource",
    "studentCompletedYears",
    "studentRemainingYears",
    "studentCompletedSemesters",
    "studentRemainingSemesters",
  ].join(",");

  const lines = rows.map((p) => {
    const programme = programmeByKey.get(`${p.organizationId}::${p.programmeCode}`) ?? null;
    const progress = programme
      ? buildStudentProgrammeProgress(programme, paymentsByStudentProg.get(`${p.studentId}::${p.programmeCode}`) ?? [])
      : null;

    return [
      p.organization.slug,
      p.organization.name,
      p.id,
      p.student.name,
      p.student.email ?? "",
      p.programmeCode,
      programme?.name ?? "",
      String(p.year),
      String(p.semester),
      p.schoolReceiptNo ?? "",
      p.paymentMode ?? "",
      p.student.schoolClass?.code ?? "",
      String(p.totalUgx),
      String(p.tonAmount),
      p.status,
      p.txHash ?? "",
      p.rail,
      p.momoReference ?? "",
      p.createdAt.toISOString(),
      p.confirmedAt?.toISOString() ?? "",
      p.feeSelectionMode ?? "semester",
      (p.includedFeeIds ?? []).join(";"),
      String(p.tuitionUgx),
      String(p.functionalFeesUgx),
      String(p.platformFeeUgx ?? 0),
      progress ? String(progress.durationYears) : "",
      progress ? String(progress.semestersPerYear) : "",
      progress ? String(progress.totalSemesters) : "",
      progress ? progress.source : "",
      progress ? String(progress.completedYears) : "",
      progress ? String(progress.remainingYears) : "",
      progress ? String(progress.completedSemesters) : "",
      progress ? String(progress.remainingSemesters) : "",
    ]
      .map((c) => csvEscape(String(c)))
      .join(",");
  });

  const body = [header, ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="odelhub-payments-${date}.csv"`,
    },
  });
}
