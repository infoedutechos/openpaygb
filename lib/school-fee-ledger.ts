import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { billChargeSessionWhere, schoolSessionWhere } from "@/lib/school-session-scope";
import {
  isPreviousBalanceAccountName,
  ensureFeeLedgerAccounts,
} from "@/lib/school-fee-ledger-accounts";

/** Keep fee ledger free of personal OpenPayGB card holder rows (no server-only import). */
const NON_TUITION_PROGRAMMES = ["ADMIN_CARD", "STAFF_CARD", "GUEST"] as const;

export type FeeLedgerStatus =
  | "cleared"
  | "partial_payment"
  | "unpaid"
  | "left"
  | "no_bill";

export type StudentFeeLedgerRow = {
  studentId: string;
  studentName: string;
  admissionNo: string;
  classCode: string | null;
  className: string | null;
  term: number;
  termLabel: string;
  feeRequiredUgx: number;
  discountUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  currentBalanceUgx: number;
  totalOutstandingUgx: number;
  status: FeeLedgerStatus;
  statusLabel: string;
  statusNote: string;
  latestPaymentId: string | null;
  latestReceiptNo: string | null;
};

export type FeeLedgerTotals = {
  feeRequiredUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  totalOutstandingUgx: number;
  studentCount: number;
  clearedCount: number;
  partialCount: number;
  unpaidCount: number;
};

function parseMoney(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  if (raw == null) return 0;
  const t = String(raw).trim();
  if (!t || t === "---" || t === "-" || /^cleared$/i.test(t)) return 0;
  const n = parseInt(t.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export { parseMoney as parseFeeLedgerMoney };

/** Map spreadsheet NEW TERM labels onto Term 1–3. */
export function mapSpreadsheetTermLabel(raw: string, fallbackTerm = 2): { term: number; termLabel: string } {
  const label = raw.trim().replace(/\s+/g, " ").toUpperCase() || `TERM ${fallbackTerm}`;
  const compact = label.replace(/[–—]/g, "-").replace(/\s/g, "");

  if (/JULY|JUL-/.test(compact) || /SEP/.test(compact) && /JUL/.test(compact)) {
    return { term: 3, termLabel: raw.trim() || "JULY – SEPT" };
  }
  if (/MAY|JUN|AUG/.test(compact)) {
    return { term: 2, termLabel: raw.trim() || "JUN – AUG" };
  }
  if (/JAN|FEB|MAR|APR/.test(compact)) {
    return { term: 1, termLabel: raw.trim() || "JAN – APR" };
  }
  const termMatch = label.match(/\b([123])\b/);
  if (termMatch) {
    return { term: normalizeSchoolTerm(termMatch[1]), termLabel: raw.trim() || `Term ${termMatch[1]}` };
  }
  return { term: normalizeSchoolTerm(fallbackTerm), termLabel: raw.trim() || `Term ${fallbackTerm}` };
}

export function deriveFeeLedgerStatus(input: {
  feeRequiredUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  totalOutstandingUgx: number;
  statusNote?: string;
}): { status: FeeLedgerStatus; statusLabel: string } {
  const note = (input.statusNote ?? "").trim().toLowerCase();
  if (note.includes("left") || note === "left") {
    return { status: "left", statusLabel: "Left" };
  }

  const expected = input.feeRequiredUgx + input.previousBalanceUgx;
  if (expected <= 0 && input.totalOutstandingUgx <= 0) {
    return { status: "no_bill", statusLabel: "No bill" };
  }
  if (input.totalOutstandingUgx <= 0) {
    return { status: "cleared", statusLabel: "Cleared" };
  }
  const paid = input.previousBalancePaidUgx + input.currentTermPaidUgx;
  if (paid > 0) {
    return { status: "partial_payment", statusLabel: "Partial Payment" };
  }
  return { status: "unpaid", statusLabel: "Unpaid" };
}

export function computeFeeLedgerAmounts(input: {
  feeRequiredUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  discountUgx?: number;
}): {
  currentBalanceUgx: number;
  totalOutstandingUgx: number;
  netFeeRequiredUgx: number;
} {
  const discount = Math.max(0, input.discountUgx ?? 0);
  const netFeeRequiredUgx = Math.max(0, input.feeRequiredUgx - discount);
  const owed = netFeeRequiredUgx + input.previousBalanceUgx;
  const paid = input.previousBalancePaidUgx + input.currentTermPaidUgx;
  const outstanding = Math.max(0, owed - paid);
  return { currentBalanceUgx: outstanding, totalOutstandingUgx: outstanding, netFeeRequiredUgx };
}

function termDisplayLabel(term: number, notes: string[]): string {
  for (const n of notes) {
    const m = n.match(/termLabel:([^|;]+)/i);
    if (m?.[1]) return m[1].trim();
  }
  if (term === 1) return "JAN – APR";
  if (term === 2) return "JUN – AUG";
  return "JULY – SEPT";
}

function extractStatusNote(notes: string[]): string {
  for (const n of notes) {
    const m = n.match(/statusNote:([^|;]+)/i);
    if (m?.[1]) return m[1].trim();
    if (/^(nxt wk|next week|left|sat|saturday)/i.test(n.trim())) return n.trim();
  }
  return "";
}

export async function listStudentFeeLedgers(input: {
  organizationId: string;
  term: number;
  sessionId?: string | null;
  schoolClassId?: string;
  q?: string;
}): Promise<{ rows: StudentFeeLedgerRow[]; totals: FeeLedgerTotals }> {
  await ensureFeeLedgerAccounts(input.organizationId);
  const term = normalizeSchoolTerm(input.term);
  const q = input.q?.trim().toLowerCase() ?? "";

  const students = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      ...schoolSessionWhere(input.sessionId),
      ...(input.schoolClassId ? { schoolClassId: input.schoolClassId } : {}),
      programmeCode: { notIn: [...NON_TUITION_PROGRAMMES] },
    },
    include: {
      schoolClass: { select: { code: true, name: true } },
      billCharges: {
        where: { term, ...billChargeSessionWhere(input.sessionId) },
        include: {
          schoolAccount: { select: { name: true } },
          allocations: {
            where: { payment: { status: PaymentStatus.confirmed } },
            select: { amountUgx: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows: StudentFeeLedgerRow[] = [];

  for (const s of students) {
    if (q) {
      const hay = `${s.name} ${s.admissionNo}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    let feeRequiredUgx = 0;
    let discountUgx = 0;
    let previousBalanceUgx = 0;
    let previousBalancePaidUgx = 0;
    let currentTermPaidUgx = 0;
    const notes: string[] = [];

    for (const c of s.billCharges) {
      if (c.notes) notes.push(c.notes);
      const paidOnCharge = c.allocations.reduce((sum, a) => sum + a.amountUgx, 0);
      const lineDiscount = Math.max(0, (c as { discountUgx?: number }).discountUgx ?? 0);
      if (isPreviousBalanceAccountName(c.schoolAccount.name)) {
        previousBalanceUgx += c.amountUgx;
        previousBalancePaidUgx += paidOnCharge;
      } else {
        feeRequiredUgx += c.amountUgx;
        discountUgx += lineDiscount;
        currentTermPaidUgx += paidOnCharge;
      }
    }

    // Fallback: confirmed payments without allocations (legacy rows)
    if (s.billCharges.length > 0 && previousBalancePaidUgx + currentTermPaidUgx === 0) {
      const paidAgg = await prisma.payment.aggregate({
        where: {
          organizationId: input.organizationId,
          studentId: s.id,
          semester: term,
          status: PaymentStatus.confirmed,
        },
        _sum: { totalUgx: true },
      });
      let remainingPaid = paidAgg._sum.totalUgx ?? 0;
      const debtSlice = Math.min(remainingPaid, previousBalanceUgx);
      previousBalancePaidUgx = debtSlice;
      remainingPaid -= debtSlice;
      const netFee = Math.max(0, feeRequiredUgx - discountUgx);
      currentTermPaidUgx = Math.min(remainingPaid, netFee);
    }

    const latestPay = await prisma.payment.findFirst({
      where: {
        organizationId: input.organizationId,
        studentId: s.id,
        semester: term,
        status: PaymentStatus.confirmed,
      },
      orderBy: { confirmedAt: "desc" },
      select: { id: true, schoolReceiptNo: true },
    });

    const { currentBalanceUgx, totalOutstandingUgx, netFeeRequiredUgx } = computeFeeLedgerAmounts({
      feeRequiredUgx,
      previousBalanceUgx,
      previousBalancePaidUgx,
      currentTermPaidUgx,
      discountUgx,
    });
    const statusNote = extractStatusNote(notes);
    const { status, statusLabel } = deriveFeeLedgerStatus({
      feeRequiredUgx: netFeeRequiredUgx,
      previousBalanceUgx,
      previousBalancePaidUgx,
      currentTermPaidUgx,
      totalOutstandingUgx,
      statusNote,
    });

    rows.push({
      studentId: s.id,
      studentName: s.name,
      admissionNo: s.admissionNo || "",
      classCode: s.schoolClass?.code ?? null,
      className: s.schoolClass?.name ?? null,
      term,
      termLabel: termDisplayLabel(term, notes),
      feeRequiredUgx: netFeeRequiredUgx,
      discountUgx,
      previousBalanceUgx,
      previousBalancePaidUgx,
      currentTermPaidUgx,
      currentBalanceUgx,
      totalOutstandingUgx,
      status,
      statusLabel,
      statusNote,
      latestPaymentId: latestPay?.id ?? null,
      latestReceiptNo: latestPay?.schoolReceiptNo || null,
    });
  }

  const totals: FeeLedgerTotals = {
    feeRequiredUgx: rows.reduce((s, r) => s + r.feeRequiredUgx, 0),
    previousBalanceUgx: rows.reduce((s, r) => s + r.previousBalanceUgx, 0),
    previousBalancePaidUgx: rows.reduce((s, r) => s + r.previousBalancePaidUgx, 0),
    currentTermPaidUgx: rows.reduce((s, r) => s + r.currentTermPaidUgx, 0),
    totalOutstandingUgx: rows.reduce((s, r) => s + r.totalOutstandingUgx, 0),
    studentCount: rows.length,
    clearedCount: rows.filter((r) => r.status === "cleared").length,
    partialCount: rows.filter((r) => r.status === "partial_payment").length,
    unpaidCount: rows.filter((r) => r.status === "unpaid").length,
  };

  return { rows, totals };
}

export async function getStudentFeeLedger(input: {
  organizationId: string;
  studentId: string;
  term: number;
  sessionId?: string | null;
}): Promise<StudentFeeLedgerRow | null> {
  const { rows } = await listStudentFeeLedgers({
    organizationId: input.organizationId,
    term: input.term,
    sessionId: input.sessionId,
  });
  return rows.find((r) => r.studentId === input.studentId) ?? null;
}
