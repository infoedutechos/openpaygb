/**
 * Display labels for fee line kinds (2026-07): shown as **Fees** / **Other Requirements**.
 * Stored values stay `tuition` / `functional` — no data migration needed.
 * Client-safe (no Prisma import).
 */
export type FeeLineKind = "tuition" | "functional";

export const FEE_LINE_KIND_LABEL: Record<FeeLineKind, string> = {
  tuition: "Fees",
  functional: "Other Requirements",
};

/** e.g. "Fees or Other Requirements" for helper copy. */
export const FEE_LINE_KIND_PAIR = `${FEE_LINE_KIND_LABEL.tuition} or ${FEE_LINE_KIND_LABEL.functional}`;

export function normalizeFeeLineKind(raw: unknown): FeeLineKind {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "functional" || s === "other requirements" || s === "other_requirements" || s === "requirements") {
    return "functional";
  }
  return "tuition";
}
