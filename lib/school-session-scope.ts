import type { Prisma } from "@prisma/client";

/** Filter students/classes to the active session (includes legacy rows with null session). */
export function schoolSessionWhere(sessionId: string | null | undefined): Prisma.StudentWhereInput {
  if (!sessionId) return {};
  return { OR: [{ schoolSessionId: sessionId }, { schoolSessionId: null }] };
}

export function schoolClassSessionWhere(sessionId: string | null | undefined): Prisma.SchoolClassWhereInput {
  if (!sessionId) return {};
  return { OR: [{ schoolSessionId: sessionId }, { schoolSessionId: null }] };
}

export function billChargeSessionWhere(sessionId: string | null | undefined): Prisma.StudentBillChargeWhereInput {
  if (!sessionId) return {};
  return { OR: [{ sessionId }, { sessionId: null }] };
}

export function currentAcademicYearLabel(): string {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
