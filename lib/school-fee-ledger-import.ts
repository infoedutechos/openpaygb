import { PaymentRail, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { csvCell, mapCsvHeaders, parseCsv } from "@/lib/school-csv";
import { ensureFeeLedgerAccounts } from "@/lib/school-fee-ledger-accounts";
import {
  mapSpreadsheetTermLabel,
  parseFeeLedgerMoney,
} from "@/lib/school-fee-ledger";
import { allocatePaymentToBillCharges } from "@/lib/school-payment-allocation";
import { nextSchoolReceiptNo } from "@/lib/school-receipt-no";
import { provisionSchoolErpDefaults } from "@/lib/school-org-provision";
import { normalizeSchoolTerm } from "@/lib/school-term";

export type FeeLedgerImportRow = {
  name: string;
  admissionNo: string;
  classCode: string;
  termLabel: string;
  term: number;
  feeRequiredUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  statusNote: string;
};

export type FeeLedgerImportResult = {
  createdStudents: number;
  updatedStudents: number;
  billsUpserted: number;
  paymentsCreated: number;
  skipped: number;
  errors: string[];
};

function encodeChargeNotes(termLabel: string, statusNote: string): string {
  const parts = [`termLabel:${termLabel}`];
  if (statusNote) parts.push(`statusNote:${statusNote}`);
  return parts.join("|");
}

/** Parse Uwais-style spreadsheet CSV into normalized ledger rows. */
export function parseFeeLedgerCsv(text: string, fallbackTerm = 2): FeeLedgerImportRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = mapCsvHeaders(rows[0] ?? []);
  const out: FeeLedgerImportRow[] = [];

  for (const row of rows.slice(1)) {
    const name =
      csvCell(row, headers, "name") ||
      csvCell(row, headers, "student name") ||
      csvCell(row, headers, "student");
    if (!name) continue;
    if (/^total$/i.test(name.trim())) continue;

    const admissionNo =
      csvCell(row, headers, "admissionno") ||
      csvCell(row, headers, "admission no") ||
      csvCell(row, headers, "admission no.") ||
      csvCell(row, headers, "no") ||
      csvCell(row, headers, "no.");

    const termRaw =
      csvCell(row, headers, "new term") ||
      csvCell(row, headers, "term") ||
      csvCell(row, headers, "termlabel") ||
      csvCell(row, headers, "term label");
    const { term, termLabel } = mapSpreadsheetTermLabel(termRaw, fallbackTerm);

    const feeRequiredUgx = parseFeeLedgerMoney(
      csvCell(row, headers, "pays") ||
        csvCell(row, headers, "fee required") ||
        csvCell(row, headers, "feerequired") ||
        csvCell(row, headers, "fee_required"),
    );
    const previousBalanceUgx = parseFeeLedgerMoney(
      csvCell(row, headers, "o/blc") ||
        csvCell(row, headers, "oblc") ||
        csvCell(row, headers, "previous balance") ||
        csvCell(row, headers, "previousbalance") ||
        csvCell(row, headers, "opening balance"),
    );
    const previousBalancePaidUgx = parseFeeLedgerMoney(
      csvCell(row, headers, "paid/debt") ||
        csvCell(row, headers, "paiddebt") ||
        csvCell(row, headers, "previous balance paid") ||
        csvCell(row, headers, "previousbalancepaid"),
    );
    const currentTermPaidUgx = parseFeeLedgerMoney(
      csvCell(row, headers, "paid/n.t") ||
        csvCell(row, headers, "paid/nt") ||
        csvCell(row, headers, "paidnt") ||
        csvCell(row, headers, "current term paid") ||
        csvCell(row, headers, "currenttermpaid") ||
        csvCell(row, headers, "paid new term"),
    );
    const statusNote =
      csvCell(row, headers, "total") ||
      csvCell(row, headers, "note") ||
      csvCell(row, headers, "notes") ||
      csvCell(row, headers, "status note") ||
      csvCell(row, headers, "status");

    const classCode =
      csvCell(row, headers, "class") ||
      csvCell(row, headers, "class code") ||
      "GENERAL";

    out.push({
      name: name.trim(),
      admissionNo: admissionNo.trim(),
      classCode: classCode.trim().toUpperCase() || "GENERAL",
      termLabel,
      term: normalizeSchoolTerm(term),
      feeRequiredUgx,
      previousBalanceUgx,
      previousBalancePaidUgx: Math.min(previousBalancePaidUgx, previousBalanceUgx || previousBalancePaidUgx),
      currentTermPaidUgx: Math.min(currentTermPaidUgx, feeRequiredUgx || currentTermPaidUgx),
      statusNote: statusNote.trim(),
    });
  }

  return out;
}

async function ensureClassAndProgramme(input: {
  organizationId: string;
  classCode: string;
}): Promise<{ schoolClassId: string; schoolStreamId: string; programmeCode: string }> {
  const code = input.classCode || "GENERAL";
  let cls = await prisma.schoolClass.findFirst({
    where: { organizationId: input.organizationId, code },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        organizationId: input.organizationId,
        code,
        name: code === "GENERAL" ? "General / Unassigned" : code,
        levelKind: "primary",
        sortOrder: 10,
      },
    });
  }

  let stream = await prisma.schoolStream.findFirst({
    where: { organizationId: input.organizationId, schoolClassId: cls.id },
    orderBy: { sortOrder: "asc" },
  });
  if (!stream) {
    stream = await prisma.schoolStream.create({
      data: {
        organizationId: input.organizationId,
        schoolClassId: cls.id,
        code: "MAIN",
        name: "Main",
        sortOrder: 10,
      },
    });
  }

  const programmeCode = `${code}-MAIN`;
  let prog = await prisma.programme.findFirst({
    where: { organizationId: input.organizationId, code: programmeCode },
  });
  if (!prog) {
    prog = await prisma.programme.create({
      data: {
        organizationId: input.organizationId,
        code: programmeCode,
        name: `${cls.name} · Main`,
        track: "regular",
        semestersPerYear: 3,
        schoolClassId: cls.id,
        schoolStreamId: stream.id,
      },
    });
  }

  return { schoolClassId: cls.id, schoolStreamId: stream.id, programmeCode: prog.code };
}

async function upsertBillCharge(input: {
  organizationId: string;
  studentId: string;
  schoolAccountId: string;
  sessionId: string | null;
  term: number;
  amountUgx: number;
  notes: string;
}): Promise<string> {
  const existing = await prisma.studentBillCharge.findFirst({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      schoolAccountId: input.schoolAccountId,
      term: input.term,
    },
  });
  if (existing) {
    await prisma.studentBillCharge.update({
      where: { id: existing.id },
      data: {
        amountUgx: input.amountUgx,
        notes: input.notes,
        sessionId: input.sessionId,
      },
    });
    // Clear prior allocations so re-import can rebuild payments cleanly when requested
    return existing.id;
  }
  const created = await prisma.studentBillCharge.create({
    data: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      schoolAccountId: input.schoolAccountId,
      sessionId: input.sessionId,
      term: input.term,
      amountUgx: input.amountUgx,
      notes: input.notes,
    },
  });
  return created.id;
}

async function recordImportedPayment(input: {
  organizationId: string;
  studentId: string;
  programmeCode: string;
  year: number;
  term: number;
  amountUgx: number;
  memo: string;
  destinationWallet: string;
  sessionId: string | null;
}): Promise<void> {
  if (input.amountUgx <= 0) return;

  const result = await prisma.$transaction(async (tx) => {
    const receiptNo = await nextSchoolReceiptNo(input.organizationId, tx);
    const payment = await tx.payment.create({
      data: {
        organizationId: input.organizationId,
        studentId: input.studentId,
        programmeCode: input.programmeCode,
        year: input.year,
        semester: input.term,
        tuitionUgx: input.amountUgx,
        functionalFeesUgx: 0,
        totalUgx: input.amountUgx,
        ugxPerTonSnapshot: 0,
        tonAmount: 0,
        destinationWallet: input.destinationWallet,
        rail: PaymentRail.manual_cash,
        paymentMode: "CASH",
        schoolReceiptNo: receiptNo,
        status: PaymentStatus.confirmed,
        confirmedAt: new Date(),
        memo: input.memo,
        feeSelectionMode: "semester",
      },
    });
    await allocatePaymentToBillCharges(
      {
        organizationId: input.organizationId,
        paymentId: payment.id,
        studentId: input.studentId,
        term: input.term,
        amountUgx: payment.totalUgx,
        sessionId: input.sessionId,
      },
      tx,
    );
    return payment;
  });
  void result;
}

export async function importFeeLedgerRows(input: {
  organizationId: string;
  rows: FeeLedgerImportRow[];
  /** When true, skip creating payments if student already has confirmed term payments. */
  skipExistingPayments?: boolean;
}): Promise<FeeLedgerImportResult> {
  const result: FeeLedgerImportResult = {
    createdStudents: 0,
    updatedStudents: 0,
    billsUpserted: 0,
    paymentsCreated: 0,
    skipped: 0,
    errors: [],
  };

  await provisionSchoolErpDefaults(input.organizationId);
  const accounts = await ensureFeeLedgerAccounts(input.organizationId);
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      destinationWallet: true,
      activeSchoolSessionId: true,
      activeSchoolTerm: true,
      admissionPrefix: true,
    },
  });
  if (!org) {
    result.errors.push("Organization not found");
    return result;
  }

  const sessionId = org.activeSchoolSessionId;
  let seq = 1;

  for (const row of input.rows) {
    try {
      if (!row.name) {
        result.skipped++;
        continue;
      }

      const enrollment = await ensureClassAndProgramme({
        organizationId: input.organizationId,
        classCode: row.classCode,
      });

      let admissionNo = row.admissionNo;
      if (!admissionNo) {
        const prefix = (org.admissionPrefix || "UQS").toUpperCase();
        admissionNo = `${prefix}-2026-${String(seq).padStart(3, "0")}`;
        seq++;
      }

      let student = await prisma.student.findFirst({
        where: {
          organizationId: input.organizationId,
          OR: [
            ...(row.admissionNo ? [{ admissionNo: row.admissionNo }] : []),
            { name: row.name },
          ],
        },
      });

      if (student) {
        student = await prisma.student.update({
          where: { id: student.id },
          data: {
            name: row.name,
            admissionNo,
            programmeCode: enrollment.programmeCode,
            schoolClassId: enrollment.schoolClassId,
            schoolStreamId: enrollment.schoolStreamId,
            schoolSessionId: sessionId,
            semester: row.term,
            year: 1,
          },
        });
        result.updatedStudents++;
      } else {
        student = await prisma.student.create({
          data: {
            organizationId: input.organizationId,
            name: row.name,
            admissionNo,
            programmeCode: enrollment.programmeCode,
            schoolClassId: enrollment.schoolClassId,
            schoolStreamId: enrollment.schoolStreamId,
            schoolSessionId: sessionId,
            year: 1,
            semester: row.term,
          },
        });
        result.createdStudents++;
      }

      const notes = encodeChargeNotes(row.termLabel, row.statusNote);

      // Previous balance charge first so FIFO allocation pays debt before tuition
      if (row.previousBalanceUgx > 0) {
        await upsertBillCharge({
          organizationId: input.organizationId,
          studentId: student.id,
          schoolAccountId: accounts.previousBalanceAccountId,
          sessionId,
          term: row.term,
          amountUgx: row.previousBalanceUgx,
          notes,
        });
        result.billsUpserted++;
      }

      if (row.feeRequiredUgx > 0) {
        await upsertBillCharge({
          organizationId: input.organizationId,
          studentId: student.id,
          schoolAccountId: accounts.tuitionAccountId,
          sessionId,
          term: row.term,
          amountUgx: row.feeRequiredUgx,
          notes,
        });
        result.billsUpserted++;
      }

      const existingPayCount = await prisma.payment.count({
        where: {
          organizationId: input.organizationId,
          studentId: student.id,
          semester: row.term,
          status: PaymentStatus.confirmed,
        },
      });

      if (input.skipExistingPayments && existingPayCount > 0) {
        continue;
      }

      if (existingPayCount === 0) {
        if (row.previousBalancePaidUgx > 0) {
          await recordImportedPayment({
            organizationId: input.organizationId,
            studentId: student.id,
            programmeCode: enrollment.programmeCode,
            year: 1,
            term: row.term,
            amountUgx: row.previousBalancePaidUgx,
            memo: "Imported: previous balance paid",
            destinationWallet: org.destinationWallet ?? "",
            sessionId,
          });
          result.paymentsCreated++;
        }
        if (row.currentTermPaidUgx > 0) {
          await recordImportedPayment({
            organizationId: input.organizationId,
            studentId: student.id,
            programmeCode: enrollment.programmeCode,
            year: 1,
            term: row.term,
            amountUgx: row.currentTermPaidUgx,
            memo: "Imported: current term paid",
            destinationWallet: org.destinationWallet ?? "",
            sessionId,
          });
          result.paymentsCreated++;
        }
      }
    } catch (e) {
      result.errors.push(`${row.name}: ${e instanceof Error ? e.message : "import failed"}`);
    }
  }

  return result;
}

export const FEE_LEDGER_CSV_TEMPLATE_HEADERS = [
  "NO.",
  "NAME",
  "CLASS",
  "NEW TERM",
  "PAYS",
  "O/BLC",
  "PAID/DEBT",
  "PAID/N.T",
  "BALANCE",
  "TOTAL",
] as const;
