/**
 * Normalize request paths for analytics cardinality control.
 * Collapses Mongo ObjectIds, UUIDs, and long numeric ids.
 */
export function normalizeVisitPath(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "/";
  let p = raw.trim().slice(0, 200);
  if (!p.startsWith("/")) p = `/${p}`;
  // Drop query/hash if somehow included
  p = p.split("?")[0]?.split("#")[0] ?? "/";
  const parts = p.split("/").filter(Boolean).map((seg) => {
    if (/^[a-f0-9]{24}$/i.test(seg)) return ":id";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ":id";
    if (/^\d{6,}$/.test(seg)) return ":id";
    return seg.slice(0, 64);
  });
  const out = `/${parts.join("/")}`;
  return out === "/" ? "/" : out.replace(/\/+$/, "") || "/";
}

export function normalizeVisitAction(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "unknown";
  return raw.trim().slice(0, 120).replace(/\s+/g, " ") || "unknown";
}
