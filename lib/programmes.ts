import { ProgrammeFeeRecurrence } from "@prisma/client";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { prisma } from "@/lib/prisma";

export type ProgrammeFeeForCheckout = {
  year: number;
  semester: number;
  tuitionUgx: number;
  functionalFeesUgx: number;
  recurrence?: ProgrammeFeeRecurrence | null;
  feeKey?: string | null;
  id?: string;
};

export type ProgrammeFeeWithId = ProgrammeFeeForCheckout & { id: string };

export type ProgrammeFeeSelectionMode = "semester" | "year";

export async function findProgrammeByCode(code: string, organizationId?: string) {
  const orgId = organizationId ?? (await getDefaultOrganizationId());
  const upper = code.toUpperCase();
  return prisma.programme.findUnique({
    where: { organizationId_code: { organizationId: orgId, code: upper } },
    include: { fees: true },
  });
}

function effectiveRecurrence(f: ProgrammeFeeForCheckout): ProgrammeFeeRecurrence {
  const r = f.recurrence;
  if (r === ProgrammeFeeRecurrence.once) return ProgrammeFeeRecurrence.once;
  if (r === ProgrammeFeeRecurrence.per_year) return ProgrammeFeeRecurrence.per_year;
  if (r === ProgrammeFeeRecurrence.per_semester) return ProgrammeFeeRecurrence.per_semester;
  /** Mongo rows created before `recurrence` existed may omit the field — treat as per-semester. */
  return ProgrammeFeeRecurrence.per_semester;
}

function feeAppliesForPeriod(f: ProgrammeFeeForCheckout, year: number, semester: number): boolean {
  switch (effectiveRecurrence(f)) {
    case ProgrammeFeeRecurrence.per_semester:
      return f.year === year && f.semester === semester;
    case ProgrammeFeeRecurrence.per_year:
      return f.year === year;
    case ProgrammeFeeRecurrence.once:
      return f.year === year && f.semester === semester;
    default:
      return false;
  }
}

/**
 * Sums all programme fee rows that apply to the student's selected year and semester:
 * - `per_semester`: same year and semester
 * - `per_year`: same year (row uses semester 0)
 * - `once`: same year and semester (one-off charge for that period only)
 */
export function aggregateProgrammeFeesForPeriod(
  fees: ProgrammeFeeForCheckout[],
  year: number,
  semester: number
): { tuitionUgx: number; functionalFeesUgx: number } | null {
  let tuitionUgx = 0;
  let functionalFeesUgx = 0;
  for (const f of fees) {
    if (feeAppliesForPeriod(f, year, semester)) {
      tuitionUgx += f.tuitionUgx;
      functionalFeesUgx += f.functionalFeesUgx;
    }
  }
  if (tuitionUgx === 0 && functionalFeesUgx === 0) return null;
  return { tuitionUgx, functionalFeesUgx };
}

/** @alias aggregateProgrammeFeesForPeriod */
export function getFeeLineFromProgramme(
  fees: ProgrammeFeeForCheckout[],
  year: number,
  semester: number
) {
  return aggregateProgrammeFeesForPeriod(fees, year, semester);
}

/** Distinct fee rows that apply to the selected academic semester. */
export function listFeeRowsForSemester(
  fees: ProgrammeFeeForCheckout[],
  year: number,
  semester: number
): ProgrammeFeeWithId[] {
  const out: ProgrammeFeeWithId[] = [];
  for (const f of fees) {
    if (!f.id || typeof f.id !== "string") continue;
    if (feeAppliesForPeriod(f, year, semester)) {
      out.push({ ...f, id: f.id });
    }
  }
  return out;
}

/**
 * Distinct fee rows that apply to any semester (1–3) in the given programme year
 * (whole-academic-year bundle: semester-specific rows for all terms in that year, plus year-level rows).
 */
export function listFeeRowsForAcademicYear(fees: ProgrammeFeeForCheckout[], year: number): ProgrammeFeeWithId[] {
  const out: ProgrammeFeeWithId[] = [];
  const seen = new Set<string>();
  for (const f of fees) {
    if (!f.id || typeof f.id !== "string") continue;
    const appliesToYear = [1, 2, 3].some((sem) => feeAppliesForPeriod(f, year, sem));
    if (appliesToYear && !seen.has(f.id)) {
      seen.add(f.id);
      out.push({ ...f, id: f.id });
    }
  }
  return out;
}

export function sumFeeRows(rows: Array<{ tuitionUgx: number; functionalFeesUgx: number }>) {
  let tuitionUgx = 0;
  let functionalFeesUgx = 0;
  for (const r of rows) {
    tuitionUgx += r.tuitionUgx;
    functionalFeesUgx += r.functionalFeesUgx;
  }
  return { tuitionUgx, functionalFeesUgx };
}

export function resolveFeeRowsForSelection(
  fees: ProgrammeFeeForCheckout[],
  opts: {
    mode: ProgrammeFeeSelectionMode;
    year: number;
    semester: number;
    selectedIds?: string[] | null;
  }
): { rows: ProgrammeFeeWithId[]; pool: ProgrammeFeeWithId[] } {
  const pool =
    opts.mode === "year"
      ? listFeeRowsForAcademicYear(fees, opts.year)
      : listFeeRowsForSemester(fees, opts.year, opts.semester);
  if (!opts.selectedIds?.length) {
    return { rows: pool, pool };
  }
  const poolById = new Map(pool.map((r) => [r.id, r]));
  const uniq = [...new Set(opts.selectedIds)];
  const rows: ProgrammeFeeWithId[] = [];
  for (const id of uniq) {
    const row = poolById.get(id);
    if (!row) {
      throw new Error("Invalid fee line selection");
    }
    rows.push(row);
  }
  if (rows.length === 0) {
    throw new Error("No fee lines selected");
  }
  return { rows, pool };
}
