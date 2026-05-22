import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";

/** Resolve a ledger row from webhook reference (Mongo payment id or stored MoMo reference). */
export async function findPaymentByMomoReference(reference: string) {
  const ref = reference.trim();
  if (!ref) return null;
  if (isValidObjectId(ref)) {
    const byId = await prisma.payment.findUnique({ where: { id: ref } });
    if (byId) return byId;
  }
  return prisma.payment.findFirst({
    where: { momoReference: ref },
    orderBy: { createdAt: "desc" },
  });
}
