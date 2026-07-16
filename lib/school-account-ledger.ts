import { PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { normalizeSchoolTerm } from "@/lib/school-term";

import { findSalaryExpenditureAccount } from "@/lib/school-salary-account";



export type AccountLedgerLine = {

  date: string;

  trackId: string;

  name: string;

  particulars: string;

  amountUgx: number;

  direction: "inflow" | "outflow";

};



export async function buildAccountLedger(input: {

  organizationId: string;

  accountId: string;

  term?: number;

}): Promise<{ accountName: string; kind: string; inflow: AccountLedgerLine[]; outflow: AccountLedgerLine[] }> {

  const account = await prisma.schoolAccount.findFirst({

    where: { id: input.accountId, organizationId: input.organizationId },

  });

  if (!account) throw new Error("Account not found");



  const term = input.term ? normalizeSchoolTerm(input.term) : undefined;

  const inflow: AccountLedgerLine[] = [];

  const outflow: AccountLedgerLine[] = [];



  if (account.kind === "income") {

    const charges = await prisma.studentBillCharge.findMany({

      where: {

        organizationId: input.organizationId,

        schoolAccountId: account.id,

        ...(term ? { term } : {}),

      },

      include: { student: { select: { name: true, id: true } } },

      orderBy: { createdAt: "asc" },

    });



    for (const c of charges) {

      inflow.push({

        date: c.createdAt.toISOString().slice(0, 10),

        trackId: c.id.slice(-8).toUpperCase(),

        name: c.student.name,

        particulars: `Bill charge Term ${c.term}`,

        amountUgx: c.amountUgx,

        direction: "inflow",

      });

    }



    const studentIds = [...new Set(charges.map((c) => c.studentId))];

    if (studentIds.length > 0) {

      const payments = await prisma.payment.findMany({

        where: {

          organizationId: input.organizationId,

          status: PaymentStatus.confirmed,

          studentId: { in: studentIds },

          ...(term ? { semester: term } : {}),

        },

        include: { student: { select: { name: true } } },

        orderBy: { confirmedAt: "asc" },

      });

      for (const p of payments) {

        inflow.push({

          date: (p.confirmedAt ?? p.createdAt).toISOString().slice(0, 10),

          trackId: p.schoolReceiptNo || p.id.slice(-8).toUpperCase(),

          name: p.student.name,

          particulars: p.paymentMode || "Payment received",

          amountUgx: p.totalUgx,

          direction: "inflow",

        });

      }

    }

  } else {

    const vouchers = await prisma.schoolOutflowVoucher.findMany({

      where: {

        organizationId: input.organizationId,

        accountId: account.id,

        ...(term ? { term } : {}),

      },

      orderBy: { disbursedAt: "asc" },

    });

    for (const v of vouchers) {

      const items = Array.isArray(v.lineItems) ? (v.lineItems as { particular?: string; amountUgx?: number }[]) : [];

      if (items.length === 0) {

        outflow.push({

          date: v.disbursedAt.toISOString().slice(0, 10),

          trackId: v.id.slice(-8).toUpperCase(),

          name: v.payee,

          particulars: v.notes || account.name,

          amountUgx: v.totalUgx,

          direction: "outflow",

        });

      } else {

        for (const line of items) {

          outflow.push({

            date: v.disbursedAt.toISOString().slice(0, 10),

            trackId: v.id.slice(-8).toUpperCase(),

            name: v.payee,

            particulars: line.particular ?? account.name,

            amountUgx: line.amountUgx ?? 0,

            direction: "outflow",

          });

        }

      }

    }



    const salaryAccount = await findSalaryExpenditureAccount(input.organizationId);

    if (salaryAccount?.id === account.id) {

      const salaryRows = await prisma.schoolSalaryPayment.findMany({

        where: { organizationId: input.organizationId, paidAt: { not: null } },

        include: { staff: { select: { name: true, staffCode: true } } },

        orderBy: { paidAt: "asc" },

      });

      for (const s of salaryRows) {

        outflow.push({

          date: (s.paidAt ?? new Date()).toISOString().slice(0, 10),

          trackId: s.id.slice(-8).toUpperCase(),

          name: s.staff.name,

          particulars: `Salary ${s.monthKey} (${s.staff.staffCode})`,

          amountUgx: s.netUgx,

          direction: "outflow",

        });

      }

    }

  }



  return { accountName: account.name, kind: account.kind, inflow, outflow };

}
