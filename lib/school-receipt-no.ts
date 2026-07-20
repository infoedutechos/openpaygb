import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export async function nextSchoolReceiptNo(
  organizationId: string,
  client: Db = prisma,
): Promise<string> {
  const org = await client.organization.update({
    where: { id: organizationId },
    data: { schoolReceiptCounter: { increment: 1 } },
    select: { schoolReceiptCounter: true },
  });
  return `RP-${org.schoolReceiptCounter}`;
}
