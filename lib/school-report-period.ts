export type SchoolReportPeriod = {
  term?: number;
  from?: Date;
  to?: Date;
};

function parseDateOnly(value: string, endOfDay: boolean): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(`${value}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Parse inclusive UTC date-only filters supplied by the school reports UI. */
export function parseSchoolReportDateRange(
  fromValue: string | null,
  toValue: string | null,
): { from?: Date; to?: Date; error?: string } {
  const from = fromValue ? parseDateOnly(fromValue, false) : undefined;
  const to = toValue ? parseDateOnly(toValue, true) : undefined;

  if (fromValue && !from) return { error: "Invalid from date" };
  if (toValue && !to) return { error: "Invalid to date" };
  if (from && to && from > to) return { error: "From date must be on or before to date" };

  return { from, to };
}

export function schoolReportDateFilter(
  from?: Date,
  to?: Date,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}
