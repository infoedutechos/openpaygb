import "server-only";

import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { getStudentFromCookies } from "@/lib/student-auth";
import { validateTelegramWebAppData } from "@/utils/server-checks";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { serializeStudentBalance } from "@/lib/tuition-balance-json";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { getTelegramOrganizationId } from "@/lib/telegram/org";
import { buildWelcomeBackMessage } from "@/lib/welcome-back";
import type { TmaMePayload, TmaRole } from "@/lib/tma-types";

export type { TmaMePayload, TmaRole } from "@/lib/tma-types";

function displayTelegramName(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
}): string {
  const n = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (n) return n;
  if (user.username) return user.username;
  return "there";
}

export function parseTelegramUserFromInitData(initData: string) {
  const v = validateTelegramWebAppData(initData.trim());
  if (!v.validatedData || v.user.id == null) return null;
  return {
    id: String(v.user.id),
    firstName: displayTelegramName(v.user),
    username: v.user.username ?? null,
  };
}

export async function findAdminByTelegramId(
  telegramId: string,
): Promise<{ adminId: string; email: string; role: string } | null> {
  const admin = await prisma.adminUser.findFirst({
    where: { telegramId },
    select: { id: true, email: true, role: true },
  });
  if (!admin) return null;
  return { adminId: admin.id, email: admin.email, role: admin.role };
}

export async function findStudentByTelegramId(
  telegramId: string,
  organizationId?: string,
): Promise<{ studentId: string; organizationId: string } | null> {
  const tid = telegramId.trim();
  if (!tid) return null;

  // Prefer explicit org, then bot default tenant, then any linked student (multi-school bots).
  if (organizationId) {
    const scoped = await prisma.student.findFirst({
      where: { telegramId: tid, organizationId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, organizationId: true },
    });
    if (scoped) return { studentId: scoped.id, organizationId: scoped.organizationId };
  }

  const defaultOrgId = await getTelegramOrganizationId();
  const inDefault = await prisma.student.findFirst({
    where: { telegramId: tid, organizationId: defaultOrgId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, organizationId: true },
  });
  if (inDefault) return { studentId: inDefault.id, organizationId: inDefault.organizationId };

  const any = await prisma.student.findFirst({
    where: { telegramId: tid, NOT: { telegramId: "" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, organizationId: true },
  });
  if (!any) return null;
  return { studentId: any.id, organizationId: any.organizationId };
}

export type TmaLinkHint = {
  studentId?: string;
  organizationId?: string;
  adminId?: string;
};

export async function buildTmaMe(initData?: string, link?: TmaLinkHint): Promise<TmaMePayload> {
  const tgUser = initData?.trim()
    ? parseTelegramUserFromInitData(initData)
    : null;

  const telegram = tgUser ?? { id: "", firstName: "there", username: null };

  const adminSession = await getAdminFromCookies();
  const studentSession = link?.studentId
    ? { sub: link.studentId, organizationId: link.organizationId ?? "" }
    : await getStudentFromCookies();
  const adminUserId = link?.adminId ?? adminSession?.sub ?? null;

  let role: TmaRole = "guest";
  let studentRow: TmaMePayload["student"] = null;
  let balance: TmaMePayload["balance"] = null;
  let card: TmaMePayload["card"] = null;
  let admin: TmaMePayload["admin"] = null;
  let master: TmaMePayload["master"] = null;
  let adminSummary: TmaMePayload["adminSummary"] = null;

  if (studentSession) {
    const row = await prisma.student.findUnique({
      where: { id: studentSession.sub },
      include: { organization: { select: { name: true, slug: true } } },
    });
    if (row && row.organizationId === studentSession.organizationId) {
      role = "student";
      studentRow = {
        id: row.id,
        name: row.name,
        email: row.email,
        programmeCode: row.programmeCode,
        year: row.year,
        semester: row.semester,
        organizationName: row.organization.name,
        organizationSlug: row.organization.slug,
        accountLabel: `${row.programmeCode}-${row.year}`,
        lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
        previousLoginAt: row.previousLoginAt?.toISOString() ?? null,
      };

      const summary = await getStudentBalanceSummary({
        studentId: row.id,
        organizationId: row.organizationId,
        programmeCode: row.programmeCode,
        year: row.year,
        semester: row.semester,
      });
      if (summary) {
        const serialized = serializeStudentBalance(summary);
        const ctx = serialized.contexts[0];
        const outstandingUgx = ctx?.remainingFullPayTotalUgx ?? ctx?.remainingSubtotalUgx ?? 0;
        const paidUgx = ctx?.confirmedPaidTotalUgx ?? ctx?.confirmedPaidSubtotalUgx ?? 0;
        const expectedFullPayTotalUgx = ctx?.expectedFullPayTotalUgx ?? outstandingUgx;
        const total = outstandingUgx + paidUgx;
        const progressPct = total > 0 ? Math.round((paidUgx / total) * 100) : 0;
        const nextPlan = serialized.installmentPlans.find((p) => p.remainingTotalUgx > 0);
        const nextSlice =
          nextPlan?.nextDueIndex != null
            ? nextPlan.slices.find((s) => s.index === nextPlan.nextDueIndex)
            : undefined;
        const hasInstallmentDue = Boolean(nextPlan && nextSlice && nextPlan.nextDueIndex != null);
        balance = {
          outstandingUgx,
          paidUgx,
          progressPct,
          expectedFullPayTotalUgx,
          partialWithoutInstallment:
            !hasInstallmentDue &&
            outstandingUgx > 0 &&
            paidUgx > 0 &&
            outstandingUgx < expectedFullPayTotalUgx,
          nextInstallment:
            nextPlan && nextSlice && nextPlan.nextDueIndex != null
              ? {
                  dueLabel: `${nextPlan.programmeCode} Y${nextPlan.year} S${nextPlan.semester} · ${nextPlan.nextDueIndex}/${nextPlan.installmentCount}`,
                  amountUgx: nextSlice.totalUgx,
                  installmentPlanId: nextPlan.installmentPlanId,
                  installmentCount: nextPlan.installmentCount,
                  installmentIndex: nextPlan.nextDueIndex,
                }
              : null,
        };
      }

      const openCard = await getStudentOpenPayCard(row.id);
      if (openCard) {
        card = {
          maskedPan: openCard.maskedPan ?? "**** **** **** ----",
          balanceUgx: openCard.balanceUgx,
          status: openCard.status,
          holderName: row.name.toUpperCase(),
          expiryLabel: openCard.issuedAt
            ? new Date(openCard.issuedAt).toLocaleDateString(undefined, {
                month: "2-digit",
                year: "2-digit",
              })
            : "—/—",
        };
      }
    }
  }

  if (adminUserId && role !== "student") {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: adminUserId },
      include: { organization: { select: { name: true, id: true } } },
    });
    if (adminUser) {
      admin = {
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        organizationName: adminUser.organization?.name ?? null,
      };
      if (adminUser.role === "master") {
        role = "master";
        const [activeSchools, totalStudents, totalPayments, activeCards, cardBalanceAgg] =
          await Promise.all([
            prisma.organization.count({ where: { tenantStatus: "active" } }),
            prisma.student.count(),
            prisma.payment.count(),
            prisma.openPayCard.count({ where: { status: "active" } }),
            prisma.openPayCard.aggregate({
              where: { status: "active" },
              _sum: { balanceUgx: true },
            }),
          ]);
        master = {
          activeSchools,
          totalStudents,
          totalPayments,
          activeCards,
          cardBalanceUgx: cardBalanceAgg._sum.balanceUgx ?? 0,
        };
      } else if (adminUser.role === "org_admin" && adminUser.organizationId) {
        role = "org_admin";
        const orgId = adminUser.organizationId;
        const [students, confirmed] = await Promise.all([
          prisma.student.count({ where: { organizationId: orgId } }),
          prisma.payment.findMany({
            where: { organizationId: orgId, status: "confirmed" },
            select: { totalUgx: true },
          }),
        ]);
        const collectedUgx = confirmed.reduce((s, p) => s + (p.totalUgx ?? 0), 0);
        adminSummary = {
          students,
          collectedUgx,
          outstandingUgx: 0,
        };
      }
    }
  }

  const welcome = buildWelcomeBackMessage({
    name: studentRow?.name ?? admin?.name ?? telegram.firstName,
    role:
      role === "master"
        ? "master"
        : role === "org_admin"
          ? "school_admin"
          : role === "student"
            ? "student"
            : "guest",
    previousLoginAt: studentRow?.previousLoginAt,
    isFirstLogin: !studentRow?.previousLoginAt,
  });

  return {
    role,
    telegram,
    welcome,
    student: studentRow,
    balance,
    card,
    admin,
    master,
    adminSummary,
  };
}
