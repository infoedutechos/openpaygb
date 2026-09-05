import { prisma } from "@/lib/prisma";
import { billChargeSessionWhere, schoolSessionWhere } from "@/lib/school-session-scope";
import { normalizeSchoolTerm } from "@/lib/school-term";

/**
 * Copy classmates' term fee heads onto a newly registered student so they
 * appear on the fee ledger with the same charges as the rest of the class.
 * Returns the number of bill charges created.
 */
export async function copyClassTermBillsToStudent(input: {
  organizationId: string;
  studentId: string;
  schoolClassId: string;
  term: number;
  sessionId?: string | null;
}): Promise<number> {
  const term = normalizeSchoolTerm(input.term);
  const sessionId = input.sessionId ?? null;

  const peers = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      schoolClassId: input.schoolClassId,
      id: { not: input.studentId },
      ...schoolSessionWhere(sessionId),
    },
    select: { id: true },
    take: 80,
  });
  if (peers.length === 0) return 0;

  const peerCharges = await prisma.studentBillCharge.findMany({
    where: {
      organizationId: input.organizationId,
      studentId: { in: peers.map((p) => p.id) },
      term,
      ...billChargeSessionWhere(sessionId),
    },
    select: { schoolAccountId: true, amountUgx: true, notes: true },
  });
  if (peerCharges.length === 0) return 0;

  /** Per fee head: count of each amount — pick the mode (most common classmate amount). */
  const byAccount = new Map<string, { amounts: Map<number, number>; notes: string }>();
  for (const c of peerCharges) {
    let entry = byAccount.get(c.schoolAccountId);
    if (!entry) {
      entry = { amounts: new Map(), notes: c.notes?.trim() ?? "" };
      byAccount.set(c.schoolAccountId, entry);
    }
    entry.amounts.set(c.amountUgx, (entry.amounts.get(c.amountUgx) ?? 0) + 1);
    if (!entry.notes && c.notes?.trim()) entry.notes = c.notes.trim();
  }

  let created = 0;
  for (const [schoolAccountId, entry] of byAccount) {
    let bestAmount = 0;
    let bestCount = -1;
    for (const [amount, count] of entry.amounts) {
      if (count > bestCount || (count === bestCount && amount > bestAmount)) {
        bestCount = count;
        bestAmount = amount;
      }
    }

    const existing = await prisma.studentBillCharge.findFirst({
      where: {
        organizationId: input.organizationId,
        studentId: input.studentId,
        schoolAccountId,
        term,
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.studentBillCharge.create({
      data: {
        organizationId: input.organizationId,
        studentId: input.studentId,
        schoolAccountId,
        sessionId,
        term,
        amountUgx: bestAmount,
        notes: entry.notes || "Copied from class fee schedule",
      },
    });
    created++;
  }

  return created;
}
