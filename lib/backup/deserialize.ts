/** Reverse `serializeRecord` for tuition backup restore. */

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/;

export function deserializeRecord(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" && ISO_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { __type?: string }).__type === "bytes" &&
    typeof (value as { base64?: string }).base64 === "string"
  ) {
    return Buffer.from((value as { base64: string }).base64, "base64");
  }
  if (Array.isArray(value)) return value.map(deserializeRecord);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "__type") continue;
      out[k] = deserializeRecord(v);
    }
    return out;
  }
  return value;
}

export function deserializeRows<T extends Record<string, unknown>>(rows: unknown[]): T[] {
  return rows.map((r) => deserializeRecord(r) as T);
}
