/** Safe ISO string for Prisma Date fields that may be plain strings after Next cache serialization. */
export function toIsoString(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function toEpochMs(value: Date | string | null | undefined): number | null {
  const iso = toIsoString(value);
  if (!iso) return null;
  return new Date(iso).getTime();
}
