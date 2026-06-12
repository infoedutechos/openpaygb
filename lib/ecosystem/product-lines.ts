/**
 * Canonical OdelPay / OpenPayGB product lines (see docs/PAYMENT_SYSTEM_ARCHITECTURE.md).
 * Shown independently on the home lobby — not merged into a single "Tuition Hub" card.
 */

export type ProductLineId = "odelpay_higher" | "odelpay_schools" | "openpaygb";

export type ProductLine = {
  id: ProductLineId;
  title: string;
  subtitle: string;
  description: string;
  audience: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  accent: "cyan" | "sky" | "violet";
};

export const PRODUCT_LINES: ProductLine[] = [
  {
    id: "odelpay_higher",
    title: "OdelPay — Higher Institutions",
    subtitle: "Universities & tertiary",
    description:
      "Programme fees by semester, TON and mobile-money checkout, receipts, and school admin tooling for universities and polytechnics.",
    audience: "Universities, polytechnics, tertiary colleges",
    primaryHref: "/pay",
    primaryLabel: "Pay tuition",
    secondaryHref: "/school/login",
    secondaryLabel: "Institution admin",
    accent: "cyan",
  },
  {
    id: "odelpay_schools",
    title: "OdelPay — Schools",
    subtitle: "Primary & secondary",
    description:
      "Same OdelPay platform with school workspace registration, term-based fees, and dedicated school admin login — tuned per tenant.",
    audience: "Primary schools, secondary schools, academies",
    primaryHref: "/admin/register?segment=schools",
    primaryLabel: "Request workspace",
    secondaryHref: "/school/login",
    secondaryLabel: "School sign in",
    accent: "sky",
  },
  {
    id: "openpaygb",
    title: "OpenPayGB",
    subtitle: "Global payments layer",
    description:
      "Closed-loop UGX card, OPGB wallet, Dex buy/swap/P2P, MoMo and TON rails — the settlement brand under OdelPay and standalone consumer flows.",
    audience: "Students, parents, global consumers & partners",
    primaryHref: "/dex",
    primaryLabel: "Open Dex Hub",
    secondaryHref: "/student/login",
    secondaryLabel: "Student wallet",
    accent: "violet",
  },
];

export const PRODUCT_LINE_ORDER: ProductLineId[] = ["odelpay_higher", "odelpay_schools", "openpaygb"];

export function productLineById(id: ProductLineId): ProductLine | undefined {
  return PRODUCT_LINES.find((p) => p.id === id);
}
