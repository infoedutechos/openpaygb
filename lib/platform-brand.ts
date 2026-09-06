/**
 * Canonical public platform brand (client-safe).
 * Prefer this over hardcoding "ODELPay HUB" — legacy strings normalize to these.
 */

export const PLATFORM_BRAND_NAME = "ODELPay HUB";
export const PLATFORM_BRAND_PAY = "ODELPay HUB Pay";
export const PLATFORM_COPILOT_NAME = "ODELPay HUB Copilot";

/** Product lines that carry independent logos in MAC. */
export const PRODUCT_LOGO_IDS = ["hub", "higher", "schools", "openpaygb"] as const;
export type ProductLogoId = (typeof PRODUCT_LOGO_IDS)[number];

export const PRODUCT_LOGO_LABELS: Record<ProductLogoId, string> = {
  hub: "ODELPay HUB",
  higher: "OdelPay — Higher",
  schools: "OdelPay — Schools",
  openpaygb: "OpenPayGB",
};

export function isProductLogoId(v: string): v is ProductLogoId {
  return (PRODUCT_LOGO_IDS as readonly string[]).includes(v);
}

/** Map stored / legacy names onto the canonical brand. */
export function normalizePlatformBrandName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return PLATFORM_BRAND_NAME;
  const lower = s.toLowerCase().replace(/\s+/g, " ");
  if (
    lower === "odel hub" ||
    lower === "odelhub" ||
    lower === "odel hub pay" ||
    lower === "odelhub pay" ||
    lower === "odelpay hub" ||
    lower === "odelpay hub pay" ||
    lower.startsWith("odel hub —") ||
    lower.startsWith("odelpay hub —")
  ) {
    return PLATFORM_BRAND_NAME;
  }
  return s;
}

export function normalizeCopilotName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return PLATFORM_COPILOT_NAME;
  const lower = s.toLowerCase().replace(/\s+/g, " ");
  if (
    lower === "odel hub copilot" ||
    lower === "odelhub copilot" ||
    lower === "odelpay hub copilot" ||
    lower === "odel hub" ||
    lower === "odelpay hub"
  ) {
    return PLATFORM_COPILOT_NAME;
  }
  return s;
}
