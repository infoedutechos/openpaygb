import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";

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
      student: { select: { name: true, email: true } },
      organization: { select: { slug: true, name: true } },
    },
  });

  const header = [
    "organizationSlug",
    "organizationName",
    "id",
    "studentName",
    "studentEmail",
    "programmeCode",
    "year",
    "semester",
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
  ].join(",");

  const lines = rows.map((p) =>
    [
      p.organization.slug,
      p.organization.name,
      p.id,
      p.student.name,
      p.student.email ?? "",
      p.programmeCode,
      String(p.year),
      String(p.semester),
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
    ]
      .map((c) => csvEscape(String(c)))
      .join(",")
  );

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
