/** Client-safe ledger date formatting (no Prisma imports). */

function formatLedgerDate(d: Date): string {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatLedgerDateDisplay(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return formatLedgerDate(date);
}
