import { PaymentRail, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveUgxPerTonForOrganization } from "@/lib/fx";
import { feeTotal, ugxToTon } from "@/lib/money";
import { defaultTonWallet } from "@/lib/constants";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { findProgrammeByCode, resolveFeeRowsForSelection, sumFeeRows, type ProgrammeFeeSelectionMode } from "@/lib/programmes";
import {
  buildInstallmentScheduleFromRule,
  resolveCheckoutPlatformFeeRule,
} from "@/lib/checkout-platform-fee";
import { normalizeInstallmentCount } from "@/lib/installments";

export type CreatedPaymentResult = {
  id: string;
  studentId: string;
  programmeCode: string;
  year: number;
  semester: number;
  tuitionUgx: number;
  functionalFeesUgx: number;
  totalUgx: number;
  platformFeeUgx: number;
  feeSelectionMode: string;
  includedFeeIds: string[];
  ugxPerTonSnapshot: number;
  tonAmount: number;
  destinationWallet: string;
  rail: PaymentRail;
  status: string;
  memo: string;
  momoReference: string;
  createdAt: Date;
};

export async function createPendingPayment(opts: {
  studentId: string;
  programmeCode: string;
  year: number;
  semester: number;
  rail: PaymentRail;
  memo?: string;
  momoReference?: string;
  feeSelectionMode?: ProgrammeFeeSelectionMode;
  feeIds?: string[];
  installmentCount?: number;
  installmentIndex?: number;
  installmentPlanId?: string;
}): Promise<CreatedPaymentResult> {
  await warmDeploymentEnvCache();
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: opts.studentId },
    select: { organizationId: true },
  });

  const org = await prisma.organization.findUnique({
    where: { id: student.organizationId },
    select: { destinationWallet: true },
  });
  const destWallet = org?.destinationWallet?.trim() || defaultTonWallet();

  let programmeCode = opts.programmeCode;
  let year = opts.year;
  let semester = opts.semester;
  let mode: ProgrammeFeeSelectionMode = opts.feeSelectionMode ?? "semester";
  let rows: Awaited<ReturnType<typeof resolveFeeRowsForSelection>>["rows"];
  let tuitionUgx: number;
  let functionalFeesUgx: number;
  let fullSubtotalUgx: number;
  let installmentCount = normalizeInstallmentCount(opts.installmentCount ?? 1);
  let installmentIndex = Math.min(
    Math.max(1, Math.round(opts.installmentIndex ?? 1)),
    installmentCount,
  );
  let installmentPlanId = opts.installmentPlanId?.trim() || "";
  let p: Awaited<ReturnType<typeof findProgrammeByCode>>;

  if (installmentPlanId) {
    const anchor = await prisma.payment.findFirst({
      where: {
        studentId: opts.studentId,
        OR: [{ id: installmentPlanId }, { installmentPlanId }],
      },
      orderBy: { installmentIndex: "asc" },
    });
    if (!anchor) {
      throw new Error("Installment plan not found");
    }
    programmeCode = anchor.programmeCode;
    year = anchor.year;
    semester = anchor.semester;
    mode =
      anchor.feeSelectionMode === "year"
        ? "year"
        : anchor.feeSelectionMode === "programme"
        ? "programme"
        : "semester";
    installmentCount = normalizeInstallmentCount(anchor.installmentCount);
    installmentIndex = Math.min(
      Math.max(1, Math.round(opts.installmentIndex ?? 1)),
      installmentCount,
    );
    installmentPlanId = anchor.installmentPlanId ?? anchor.id;

    p = await findProgrammeByCode(programmeCode, student.organizationId);
    if (!p) {
      throw new Error("Programme not found");
    }
    try {
      const resolved = resolveFeeRowsForSelection(p.fees, {
        mode,
        year,
        semester,
        selectedIds: anchor.includedFeeIds?.length ? anchor.includedFeeIds : undefined,
      });
      rows = resolved.rows;
    } catch {
      throw new Error("Invalid fee line selection");
    }
    const summed = sumFeeRows(rows);
    tuitionUgx = summed.tuitionUgx;
    functionalFeesUgx = summed.functionalFeesUgx;
    if (tuitionUgx === 0 && functionalFeesUgx === 0) {
      throw new Error("No fee schedule for year/semester");
    }
    fullSubtotalUgx =
      anchor.installmentScheduleSubtotalUgx ?? feeTotal(tuitionUgx, functionalFeesUgx);
  } else {
    p = await findProgrammeByCode(programmeCode, student.organizationId);
    if (!p) {
      throw new Error("Programme not found");
    }
    try {
      const resolved = resolveFeeRowsForSelection(p.fees, {
        mode,
        year,
        semester,
        selectedIds: opts.feeIds,
      });
      rows = resolved.rows;
    } catch {
      throw new Error("Invalid fee line selection");
    }
    const summed = sumFeeRows(rows);
    tuitionUgx = summed.tuitionUgx;
    functionalFeesUgx = summed.functionalFeesUgx;
    if (tuitionUgx === 0 && functionalFeesUgx === 0) {
      throw new Error("No fee schedule for year/semester");
    }
    fullSubtotalUgx = feeTotal(tuitionUgx, functionalFeesUgx);
    installmentCount = normalizeInstallmentCount(opts.installmentCount ?? 1);
    installmentIndex = Math.min(
      Math.max(1, Math.round(opts.installmentIndex ?? 1)),
      installmentCount,
    );
  }

  if (!p) {
    throw new Error("Programme not found");
  }

  const feeRule = await resolveCheckoutPlatformFeeRule(student.organizationId);
  const schedule = buildInstallmentScheduleFromRule(fullSubtotalUgx, feeRule, installmentCount);
  const slice = schedule.slices[installmentIndex - 1];
  if (!slice) {
    throw new Error("Invalid installment selection");
  }
  const ratio = fullSubtotalUgx > 0 ? slice.subtotalUgx / fullSubtotalUgx : 1;
  const chargeTuitionUgx = Math.round(tuitionUgx * ratio);
  const chargeFunctionalUgx = slice.subtotalUgx - chargeTuitionUgx;
  const chargePlatformFeeUgx = slice.platformFeeUgx;
  const totalUgx = slice.totalUgx;
  const { ugxPerTon } = await getActiveUgxPerTonForOrganization(student.organizationId);
  const tonAmount = ugxToTon(totalUgx, ugxPerTon);
  const installmentLabel =
    installmentCount > 1 ? ` · installment ${installmentIndex}/${installmentCount}` : "";
  const bundleLabel =
    mode === "programme"
      ? " (full programme bundle)"
      : mode === "year"
      ? " (year bundle)"
      : "";
  const memo =
    opts.memo ||
    `ODEL Hub - ${p.code} Yr${year} Sem ${semester}${bundleLabel}${installmentLabel}`;

  const doc = await prisma.payment.create({
    data: {
      organizationId: student.organizationId,
      studentId: opts.studentId,
      programmeCode: p.code,
      year,
      semester,
      tuitionUgx: chargeTuitionUgx,
      functionalFeesUgx: chargeFunctionalUgx,
      totalUgx,
      ugxPerTonSnapshot: ugxPerTon,
      tonAmount,
      destinationWallet: destWallet,
      rail: opts.rail,
      status: PaymentStatus.pending,
      memo,
      feeSelectionMode: mode,
      includedFeeIds: rows.map((r) => r.id),
      platformFeeUgx: chargePlatformFeeUgx,
      installmentCount,
      installmentIndex,
      installmentScheduleSubtotalUgx: fullSubtotalUgx,
      ...(installmentPlanId ? { installmentPlanId } : {}),
      ...(opts.momoReference?.trim() ? { momoReference: opts.momoReference.trim() } : {}),
    },
  });

  const planId = installmentPlanId || doc.id;
  const memoWithRef = `${memo} · ref:${doc.id}`;
  const final = await prisma.payment.update({
    where: { id: doc.id },
    data: {
      memo: memoWithRef,
      ...(installmentCount > 1 && !installmentPlanId ? { installmentPlanId: planId } : {}),
    },
  });

  return {
    id: final.id,
    studentId: final.studentId,
    programmeCode: final.programmeCode,
    year: final.year,
    semester: final.semester,
    tuitionUgx: final.tuitionUgx,
    functionalFeesUgx: final.functionalFeesUgx,
    totalUgx: final.totalUgx,
    platformFeeUgx: final.platformFeeUgx ?? 0,
    feeSelectionMode: final.feeSelectionMode ?? "semester",
    includedFeeIds: final.includedFeeIds ?? [],
    ugxPerTonSnapshot: final.ugxPerTonSnapshot,
    tonAmount: final.tonAmount,
    destinationWallet: final.destinationWallet,
    rail: final.rail,
    status: final.status,
    memo: final.memo,
    momoReference: final.momoReference ?? "",
    createdAt: final.createdAt,
  };
}
