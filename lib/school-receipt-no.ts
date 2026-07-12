import { prisma } from "@/lib/prisma";

export async function nextSchoolReceiptNo(organizationId: string): Promise<string> {
  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { schoolReceiptCounter: { increment: 1 } },
    select: { schoolReceiptCounter: true },
  });
  return `RP-${org.schoolReceiptCounter}`;
}
