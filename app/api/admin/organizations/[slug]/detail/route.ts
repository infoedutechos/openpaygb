import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import {
  PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX,
  getCheckoutPlatformFeeUgxForOrganization,
  resolveCheckoutPlatformFeeRule,
  describeCheckoutFeeRule,
} from "@/lib/checkout-platform-fee";
import { normalizeProgrammeTrack } from "@/lib/programme-track";
import { prisma } from "@/lib/prisma";
import { getProgrammeDurationSummary } from "@/lib/tuition-progress";

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = (await ctx.params).slug?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "Missing organization slug" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      tenantStatus: true,
      destinationWallet: true,
      registrationContactEmail: true,
      registrationNote: true,
      checkoutPlatformFeeKind: true,
      checkoutPlatformFeeUgx: true,
      checkoutPlatformFeePercent: true,
      faviconUploadedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  if ("organizationId" in orgWhere && orgWhere.organizationId !== org.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    studentCount,
    programmeCount,
    paymentCount,
    confirmedPaymentCount,
    adminUserCount,
    programmes,
    recentPayments,
    latestFx,
    checkoutFeeRule,
    effectivePlatformFeeUgx,
  ] = await Promise.all([
    prisma.student.count({ where: { organizationId: org.id } }),
    prisma.programme.count({ where: { organizationId: org.id } }),
    prisma.payment.count({ where: { organizationId: org.id } }),
    prisma.payment.count({ where: { organizationId: org.id, status: "confirmed" } }),
    prisma.adminUser.count({ where: { organizationId: org.id } }),
    prisma.programme.findMany({
      where: { organizationId: org.id },
      orderBy: { code: "asc" },
      include: {
        fees: { orderBy: [{ year: "asc" }, { semester: "asc" }] },
        _count: { select: { fees: true } },
      },
    }),
    prisma.payment.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        totalUgx: true,
        createdAt: true,
        student: { select: { name: true, programmeCode: true } },
      },
    }),
    prisma.fxRate.findFirst({
      where: { organizationId: org.id },
      orderBy: { effectiveAt: "desc" },
      select: { ugxPerTon: true, source: true, effectiveAt: true },
    }),
    resolveCheckoutPlatformFeeRule(org.id),
    getCheckoutPlatformFeeUgxForOrganization(org.id, PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX),
  ]);

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      tenantStatus: org.tenantStatus,
      destinationWallet: org.destinationWallet,
      registrationContactEmail: org.registrationContactEmail,
      registrationNote: org.registrationNote,
      checkoutPlatformFeeKind: org.checkoutPlatformFeeKind,
      checkoutPlatformFeeUgx: org.checkoutPlatformFeeUgx,
      checkoutPlatformFeePercent: org.checkoutPlatformFeePercent,
      checkoutPlatformFeeRule: describeCheckoutFeeRule(checkoutFeeRule),
      effectivePlatformFeeUgx,
      effectivePlatformFeePreviewSubtotalUgx: PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX,
      hasFavicon: Boolean(org.faviconUploadedAt),
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    },
    counts: {
      students: studentCount,
      programmes: programmeCount,
      payments: paymentCount,
      confirmedPayments: confirmedPaymentCount,
      adminUsers: adminUserCount,
    },
    programmes: programmes.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      track: normalizeProgrammeTrack(p.track),
      durationYears: p.durationYears ?? 0,
      semestersPerYear: p.semestersPerYear ?? 0,
      duration: getProgrammeDurationSummary(p),
      feeCount: p._count.fees,
      fees: p.fees.map((f) => ({
        id: f.id,
        year: f.year,
        semester: f.semester,
        recurrence: f.recurrence,
        feeKey: f.feeKey,
        tuitionUgx: f.tuitionUgx,
        functionalFeesUgx: f.functionalFeesUgx,
      })),
    })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      status: p.status,
      amountUgx: p.totalUgx,
      createdAt: p.createdAt,
      studentName: p.student.name,
      programmeCode: p.student.programmeCode,
    })),
    fxRate: latestFx
      ? {
          ugxPerTon: latestFx.ugxPerTon,
          source: latestFx.source,
          effectiveAt: latestFx.effectiveAt,
        }
      : null,
  });
}
