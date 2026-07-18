import { PaymentRail, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { schoolTermLabel } from "@/lib/school-term";

export type SchoolReceiptRow = {
  id: string;
  receiptNo: string;
  date: string;
  studentName: string;
  classCode: string | null;
  term: number;
  termLabel: string;
  paymentMode: string;
  totalUgx: number;
  rail: string;
};

export async function listSchoolReceipts(input: {
  organizationId: string;
  term?: number;
  schoolClassId?: string;
  limit?: number;
}): Promise<SchoolReceiptRow[]> {
  const payments = await prisma.payment.findMany({
    where: {
      organizationId: input.organizationId,
      status: PaymentStatus.confirmed,
      ...(input.term ? { semester: normalizeSchoolTerm(input.term) } : {}),
      ...(input.schoolClassId
        ? { student: { schoolClassId: input.schoolClassId } }
        : {}),
    },
    orderBy: { confirmedAt: "desc" },
    take: input.limit ?? 500,
    include: {
      student: {
        select: {
          name: true,
          schoolClass: { select: { code: true } },
        },
      },
    },
  });

  return payments.map((p, i) => ({
    id: p.id,
    receiptNo: p.schoolReceiptNo || `RP-${i + 1}`,
    date: (p.confirmedAt ?? p.createdAt).toISOString().slice(0, 10),
    studentName: p.student.name,
    classCode: p.student.schoolClass?.code ?? null,
    term: p.semester,
    termLabel: schoolTermLabel(p.semester),
    paymentMode: p.paymentMode || (p.rail === PaymentRail.manual_cash ? "CASH" : p.rail),
    totalUgx: p.totalUgx,
    rail: p.rail,
  }));
}
