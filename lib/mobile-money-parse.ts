/** Generic JSON field extraction for master-configured mobile-money webhooks. */

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

export function extractField(body: unknown, field: string): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  return str(o[field]);
}

export function extractFirstField(body: unknown, fields: string[]): string | null {
  for (const f of fields) {
    const v = extractField(body, f);
    if (v) return v;
  }
  return null;
}

export function isSuccessStatus(body: unknown, statusField: string, successValues: string[]): boolean {
  const raw = extractField(body, statusField);
  if (!raw) return false;
  const norm = raw.toLowerCase();
  return successValues.some((s) => s.toLowerCase() === norm);
}
