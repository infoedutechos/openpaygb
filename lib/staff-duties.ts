export type StaffDutyCategory = "teaching" | "non_teaching";

export type StaffDuty = {
  label: string;
  category: StaffDutyCategory;
};

export const DEFAULT_STAFF_DUTIES: StaffDuty[] = [
  { label: "DOS", category: "teaching" },
  { label: "Teacher", category: "teaching" },
  { label: "Head Teacher", category: "teaching" },
  { label: "Deputy Head", category: "teaching" },
  { label: "Bursar", category: "non_teaching" },
  { label: "Secretary", category: "non_teaching" },
  { label: "Accountant", category: "non_teaching" },
  { label: "Nurse", category: "non_teaching" },
  { label: "Security", category: "non_teaching" },
  { label: "Cook", category: "non_teaching" },
];

function normalizeCategory(raw: unknown): StaffDutyCategory {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "teaching" || s === "teach") return "teaching";
  return "non_teaching";
}

/** Parse org `staffDuties` JSON into a clean catalogue (empty → defaults for UI bootstrap). */
export function parseStaffDuties(raw: unknown, opts?: { fallbackDefaults?: boolean }): StaffDuty[] {
  const fallback = opts?.fallbackDefaults !== false;
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback ? [...DEFAULT_STAFF_DUTIES] : [];
  }
  const out: StaffDuty[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === "string") {
      const label = item.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        label,
        category: /teach|dos|head/i.test(label) ? "teaching" : "non_teaching",
      });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label =
      typeof row.label === "string"
        ? row.label.trim()
        : typeof row.name === "string"
          ? row.name.trim()
          : "";
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, category: normalizeCategory(row.category) });
  }
  return out.length ? out : fallback ? [...DEFAULT_STAFF_DUTIES] : [];
}

export function serializeStaffDuties(duties: StaffDuty[]): StaffDuty[] {
  return parseStaffDuties(duties, { fallbackDefaults: false });
}

export function isTeachingDutyLabel(duty: string, catalogue?: StaffDuty[]): boolean {
  const label = duty.trim();
  if (!label) return false;
  const match = catalogue?.find((d) => d.label.toLowerCase() === label.toLowerCase());
  if (match) return match.category === "teaching";
  return /teach|dos|head/i.test(label);
}
