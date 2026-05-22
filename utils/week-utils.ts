// utils/week-utils.ts - ISO week (Mon-Sun) for weekly events

/** Get ISO week key for a date (e.g. "2025-W05") */
export function getWeekKey(d: Date = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7)); // Thursday (ISO: week has Thu)
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return date.getFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

/** Get start and end (exclusive) of the week for a weekKey (e.g. "2025-W05"). UTC. */
export function getWeekStartEnd(weekKey: string): { start: Date; end: Date } {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) {
    const now = new Date();
    return { start: now, end: now };
  }
  const y = parseInt(match[1], 10);
  const w = parseInt(match[2], 10);
  // Jan 4 is always in ISO week 1 of its year
  const jan4 = new Date(Date.UTC(y, 0, 4, 0, 0, 0, 0));
  const dayOfJan4 = jan4.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = (dayOfJan4 + 6) % 7; // 0 if Mon, 1 if Sun, etc.
  const week1Monday = new Date(Date.UTC(y, 0, 4 - daysToMonday, 0, 0, 0, 0));
  const start = new Date(week1Monday);
  start.setUTCDate(start.getUTCDate() + (w - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}
