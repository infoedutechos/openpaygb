import { prisma } from "@/lib/prisma";

/** Expenditure account used for salary appropriation / outflow (name contains SALARY). */
export async function findSalaryExpenditureAccount(organizationId: string) {
  return prisma.schoolAccount.findFirst({
    where: {
      organizationId,
      kind: "expenditure",
      name: { contains: "SALARY", mode: "insensitive" },
    },
    select: { id: true, name: true },
  });
}
