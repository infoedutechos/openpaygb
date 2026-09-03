import { prisma } from "@/lib/prisma";

/** Canonical income heads used by the spreadsheet-style student fee ledger. */
export const FEE_LEDGER_TUITION_ACCOUNT = "TUITION";
export const FEE_LEDGER_PREVIOUS_BALANCE_ACCOUNT = "PREVIOUS BALANCE";

export const FEE_LEDGER_EXTRA_INCOME_ACCOUNTS = [
  "BOARDING",
  "FEEDING",
  "UNIFORM",
  "TRANSPORT",
  "QURAN MEMORISATION",
] as const;

export function isPreviousBalanceAccountName(name: string): boolean {
  const n = name.trim().toUpperCase();
  return n === FEE_LEDGER_PREVIOUS_BALANCE_ACCOUNT || n === "ARREARS" || n === "O/BLC" || n === "OPENING BALANCE";
}

export function isCurrentTermFeeAccountName(name: string): boolean {
  return !isPreviousBalanceAccountName(name);
}

/** Ensure TUITION + PREVIOUS BALANCE (+ optional extras) exist for ledger import/views. */
export async function ensureFeeLedgerAccounts(organizationId: string): Promise<{
  tuitionAccountId: string;
  previousBalanceAccountId: string;
}> {
  const names = [
    FEE_LEDGER_TUITION_ACCOUNT,
    FEE_LEDGER_PREVIOUS_BALANCE_ACCOUNT,
    ...FEE_LEDGER_EXTRA_INCOME_ACCOUNTS,
  ];

  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    const existing = await prisma.schoolAccount.findFirst({
      where: { organizationId, name, kind: "income" },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.schoolAccount.create({
      data: {
        organizationId,
        name,
        kind: "income",
        sortOrder: 200 + i,
        enabled: true,
      },
    });
  }

  const tuition = await prisma.schoolAccount.findFirstOrThrow({
    where: { organizationId, name: FEE_LEDGER_TUITION_ACCOUNT, kind: "income" },
    select: { id: true },
  });
  const previous = await prisma.schoolAccount.findFirstOrThrow({
    where: { organizationId, name: FEE_LEDGER_PREVIOUS_BALANCE_ACCOUNT, kind: "income" },
    select: { id: true },
  });

  return { tuitionAccountId: tuition.id, previousBalanceAccountId: previous.id };
}
