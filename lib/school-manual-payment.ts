import { PaymentRail, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { getStudentTermOutstanding } from "@/lib/school-account-balance";
import { allocatePaymentToBillCharges } from "@/lib/school-payment-allocation";
import { loadSchoolOrgContext } from "@/lib/school-org-context";

export type SchoolPaymentMode = "CASH" | "MOBILE TRANSFER";

export async function nextSchoolReceiptNo(organizationId: string): Promise<string> {
  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { schoolReceiptCounter: { increment: 1 } },
    select: { schoolReceiptCounter: true },
  });
  return `RP-${org.schoolReceiptCounter}`;
}

export async function recordSchoolManualPayment(input: {
  organizationId: string;
  studentId: string;
  term: number;
  amountUgx: number;
  paymentMode: SchoolPaymentMode;
  notes?: string;
}): Promise<{ paymentId: string; receiptNo: string; totalUgx: number }> {
  const term = normalizeSchoolTerm(input.term);
  if (input.amountUgx <= 0) throw new Error("Amount must be positive");

  const student = await prisma.student.findFirst({
    where: { id: input.studentId, organizationId: input.organizationId },
    select: { id: true, programmeCode: true, year: true, organizationId: true },
  });
  if (!student) throw new Error("Student not found");

  const outstanding = await getStudentTermOutstanding({
    organizationId: input.organizationId,
    studentId: student.id,
    term,
  });
  if (outstanding > 0 && input.amountUgx > outstanding) {
    throw new Error(`Payment exceeds outstanding balance (${outstanding.toLocaleString()} UGX)`);
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { destinationWallet: true },
  });
  const receiptNo = await nextSchoolReceiptNo(input.organizationId);

  const payment = await prisma.payment.create({
    data: {
      organizationId: input.organizationId,
      studentId: student.id,
      programmeCode: student.programmeCode,
      year: student.year,
      semester: term,
      tuitionUgx: input.amountUgx,
      functionalFeesUgx: 0,
      totalUgx: input.amountUgx,
      ugxPerTonSnapshot: 0,
      tonAmount: 0,
      destinationWallet: org?.destinationWallet ?? "",
      rail: PaymentRail.manual_cash,
      paymentMode: input.paymentMode,
      schoolReceiptNo: receiptNo,
      status: PaymentStatus.confirmed,
      confirmedAt: new Date(),
      memo: input.notes?.trim() ?? "",
      feeSelectionMode: "semester",
    },
  });

  const ctx = await loadSchoolOrgContext(input.organizationId);
  await allocatePaymentToBillCharges({
    organizationId: input.organizationId,
    paymentId: payment.id,
    studentId: student.id,
    term,
    amountUgx: payment.totalUgx,
    sessionId: ctx?.sessionId,
  });

  handleFirstTimeConfirmation(payment);

  return { paymentId: payment.id, receiptNo, totalUgx: payment.totalUgx };
}
