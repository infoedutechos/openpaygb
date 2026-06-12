import type { InstitutionTier, ProgrammeFeeRecurrence } from "@prisma/client";
import { feeTotal } from "@/lib/money";
import { formatFeeKeyLabel, recurrenceLabel } from "@/lib/programme-fee-labels";
import {
  resolveFeeRowsForSelection,
  sumFeeRows,
  type ProgrammeFeeForCheckout,
  type ProgrammeFeeSelectionMode,
} from "@/lib/programmes";

export type ReceiptFeeLine = {
  id: string;
  label: string;
  feeKey: string;
  recurrenceLabel: string;
  year: number;
  semester: number;
  tuitionUgx: number;
  functionalFeesUgx: number;
  lineTotalUgx: number;
};

export type ReceiptBreakdown = {
  lines: ReceiptFeeLine[];
  subtotalTuitionUgx: number;
  subtotalFunctionalUgx: number;
  subtotalUgx: number;
  platformFeeUgx: number;
  totalUgx: number;
  tonAmount: number;
  installmentLabel: string | null;
  isLegacyAggregate: boolean;
};

export type ReceiptPaymentLike = {
  tuitionUgx: number;
  functionalFeesUgx: number;
  totalUgx: number;
  platformFeeUgx?: number | null;
  tonAmount: number;
  includedFeeIds?: string[] | null;
  feeSelectionMode?: string | null;
  year: number;
  semester: number;
  installmentCount?: number | null;
  installmentIndex?: number | null;
  installmentScheduleSubtotalUgx?: number | null;
};

function normalizeMode(mode: string | null | undefined): ProgrammeFeeSelectionMode {
  if (mode === "year") return "year";
  if (mode === "programme") return "programme";
  return "semester";
}

function scaleLineAmounts(
  rows: Array<{ id: string; feeKey: string; recurrence: ProgrammeFeeRecurrence | null | undefined; year: number; semester: number; tuitionUgx: number; functionalFeesUgx: number }>,
  targetTuition: number,
  targetFunctional: number,
  institutionTier?: InstitutionTier | string | null,
): ReceiptFeeLine[] {
  if (rows.length === 0) return [];

  const full = sumFeeRows(rows);
  const fullSubtotal = feeTotal(full.tuitionUgx, full.functionalFeesUgx);
  const chargeSubtotal = feeTotal(targetTuition, targetFunctional);
  const ratio = fullSubtotal > 0 ? chargeSubtotal / fullSubtotal : 1;

  const scaled: ReceiptFeeLine[] = [];
  let tuitionRunning = 0;
  let functionalRunning = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const isLast = i === rows.length - 1;
    let tuitionUgx: number;
    let functionalFeesUgx: number;
    if (isLast) {
      tuitionUgx = targetTuition - tuitionRunning;
      functionalFeesUgx = targetFunctional - functionalRunning;
    } else {
      tuitionUgx = Math.round(row.tuitionUgx * ratio);
      functionalFeesUgx = Math.round(row.functionalFeesUgx * ratio);
      tuitionRunning += tuitionUgx;
      functionalRunning += functionalFeesUgx;
    }
    scaled.push({
      id: row.id,
      label: formatFeeKeyLabel(row.feeKey ?? "default"),
      feeKey: row.feeKey ?? "default",
      recurrenceLabel: recurrenceLabel(row.recurrence ?? null, institutionTier),
      year: row.year,
      semester: row.semester,
      tuitionUgx,
      functionalFeesUgx,
      lineTotalUgx: feeTotal(tuitionUgx, functionalFeesUgx),
    });
  }

  return scaled;
}

function legacyAggregateLines(payment: ReceiptPaymentLike): ReceiptFeeLine[] {
  const lines: ReceiptFeeLine[] = [];
  if (payment.tuitionUgx > 0) {
    lines.push({
      id: "legacy-tuition",
      label: "Tuition",
      feeKey: "tuition",
      recurrenceLabel: "",
      year: payment.year,
      semester: payment.semester,
      tuitionUgx: payment.tuitionUgx,
      functionalFeesUgx: 0,
      lineTotalUgx: payment.tuitionUgx,
    });
  }
  if (payment.functionalFeesUgx > 0) {
    lines.push({
      id: "legacy-functional",
      label: "Functional fees",
      feeKey: "functional",
      recurrenceLabel: "",
      year: payment.year,
      semester: payment.semester,
      tuitionUgx: 0,
      functionalFeesUgx: payment.functionalFeesUgx,
      lineTotalUgx: payment.functionalFeesUgx,
    });
  }
  return lines;
}

export function buildReceiptBreakdown(
  payment: ReceiptPaymentLike,
  programmeFees: ProgrammeFeeForCheckout[],
  institutionTier?: InstitutionTier | string | null,
): ReceiptBreakdown {
  const platformFeeUgx = payment.platformFeeUgx ?? 0;
  const installmentCount = payment.installmentCount ?? 1;
  const installmentIndex = payment.installmentIndex ?? 1;
  const installmentLabel =
    installmentCount > 1 ? `Installment ${installmentIndex} of ${installmentCount}` : null;

  const mode = normalizeMode(payment.feeSelectionMode);
  let sourceRows: Array<{
    id: string;
    feeKey: string;
    recurrence: ProgrammeFeeRecurrence | null | undefined;
    year: number;
    semester: number;
    tuitionUgx: number;
    functionalFeesUgx: number;
  }> = [];

  try {
    const selectedIds = payment.includedFeeIds?.length ? payment.includedFeeIds : undefined;
    const resolved = resolveFeeRowsForSelection(programmeFees, {
      mode,
      year: payment.year,
      semester: payment.semester,
      selectedIds,
    });
    sourceRows = resolved.rows.map((r) => ({
      id: r.id,
      feeKey: r.feeKey ?? "default",
      recurrence: r.recurrence ?? null,
      year: r.year,
      semester: r.semester,
      tuitionUgx: r.tuitionUgx,
      functionalFeesUgx: r.functionalFeesUgx,
    }));
  } catch {
    sourceRows = [];
  }

  let lines: ReceiptFeeLine[] = [];
  let isLegacyAggregate = false;

  if (sourceRows.length === 0) {
    lines = legacyAggregateLines(payment);
    isLegacyAggregate = true;
  } else {
    lines = scaleLineAmounts(sourceRows, payment.tuitionUgx, payment.functionalFeesUgx, institutionTier);
    const lineSubtotal = lines.reduce((sum, line) => sum + line.lineTotalUgx, 0);
    const chargeSubtotal = feeTotal(payment.tuitionUgx, payment.functionalFeesUgx);
    if (lineSubtotal === 0 && chargeSubtotal > 0) {
      lines = legacyAggregateLines(payment);
      isLegacyAggregate = true;
    }
  }

  const subtotalTuitionUgx = payment.tuitionUgx;
  const subtotalFunctionalUgx = payment.functionalFeesUgx;
  const subtotalUgx = feeTotal(subtotalTuitionUgx, subtotalFunctionalUgx);

  return {
    lines,
    subtotalTuitionUgx,
    subtotalFunctionalUgx,
    subtotalUgx,
    platformFeeUgx,
    totalUgx: payment.totalUgx,
    tonAmount: payment.tonAmount,
    installmentLabel,
    isLegacyAggregate,
  };
}
