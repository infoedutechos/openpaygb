import type { SchoolAccountKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Default income + expenditure heads for a new school workspace (reference app patterns). */
export const DEFAULT_SCHOOL_INCOME_ACCOUNTS = [
  "APPLICATION (ONCE)",
  "ADMISSION (ONCE)",
  "REGISTRATION (TERM 1)",
  "REGISTRATION (TERM 2)",
  "REGISTRATION (TERM 3)",
  "DEVELOPMENT (TERM 1)",
  "DEVELOPMENT (TERM 2)",
  "DEVELOPMENT (TERM 3)",
  "STUDENT ID",
  "STUDENTS GUILD (TERM 1)",
  "STUDENTS GUILD (TERM 2)",
  "STUDENTS GUILD (TERM 3)",
] as const;

export const DEFAULT_SCHOOL_EXPENDITURE_ACCOUNTS = ["SALARY"] as const;

export async function ensureDefaultSchoolAccounts(organizationId: string): Promise<void> {
  const existing = await prisma.schoolAccount.count({ where: { organizationId } });
  if (existing > 0) return;

  const rows: { organizationId: string; name: string; kind: SchoolAccountKind; sortOrder: number }[] = [
    ...DEFAULT_SCHOOL_INCOME_ACCOUNTS.map((name, i) => ({
      organizationId,
      name,
      kind: "income" as const,
      sortOrder: i,
    })),
    ...DEFAULT_SCHOOL_EXPENDITURE_ACCOUNTS.map((name, i) => ({
      organizationId,
      name,
      kind: "expenditure" as const,
      sortOrder: 100 + i,
    })),
  ];

  await prisma.schoolAccount.createMany({ data: rows });
}
