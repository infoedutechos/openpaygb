/**
 * Canonical OdelPay / OpenPayGB product lines (see docs/PAYMENT_SYSTEM_ARCHITECTURE.md).
 * Shown independently on the home lobby — not merged into a single "Tuition Hub" card.
 */

export type ProductLineId = "odelpay_higher" | "odelpay_schools" | "openpaygb" | "developers";

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
    accent: "cyan" | "sky" | "violet" | "emerald";
};

export const PRODUCT_LINES: ProductLine[] = [
  {
    id: "odelpay_higher",
    title: "OdelPay — Higher Institutions",
    subtitle: "Universities & tertiary",
    description:
      "Programme fees by semester, TON and mobile-money checkout, receipts, and school admin tooling for universities and polytechnics.",
    audience: "Universities, polytechnics, tertiary colleges",
    primaryHref: "/OdelPayUniversities",
    primaryLabel: "Open OdelPay Universities",
    secondaryHref: "/school/login",
    secondaryLabel: "Institution admin",
    accent: "cyan",
  },
  {
    id: "odelpay_schools",
    title: "OdelPay — Schools",
    subtitle: "Primary & secondary",
    description:
      "School workspace registration with term-based fee schedules (Term 1–3 UI), receipts, and school admin login — tuned per tenant.",
    audience: "Primary schools, secondary schools, academies",
    primaryHref: "/OdelPaySchools",
    primaryLabel: "Open OdelPay Schools",
    secondaryHref: "/admin/register?segment=schools",
    secondaryLabel: "Request workspace",
    accent: "sky",
  },
  {
    id: "openpaygb",
    title: "OpenPayGB",
    subtitle: "Global payments layer",
    description:
      "Closed-loop UGX card, OPGB wallet, Dex buy/swap/P2P, MoMo and TON rails — the settlement brand under OdelPay and standalone consumer flows.",
    audience: "Students, parents, global consumers & partners",
    primaryHref: "/opgb",
    primaryLabel: "Open OpenPayGB",
    secondaryHref: "/student/login",
    secondaryLabel: "Student wallet",
    accent: "violet",
  },
  {
    id: "developers",
    title: "ODEL HUB Developers",
    subtitle: "Partner & OPGB integrators",
    description:
      "Self-serve app registry, Partner API keys, Dex payment intents, OPGB balance reads, OAuth client credentials, and webhook endpoints for third-party branded apps.",
    audience: "SIS vendors, fintech partners, OPGB app builders",
    primaryHref: "/developers",
    primaryLabel: "Developer dashboard",
    secondaryHref: "/help?hub=dex",
    secondaryLabel: "Integration FAQ",
    accent: "emerald",
  },
];

export const PRODUCT_LINE_ORDER: ProductLineId[] = [
  "odelpay_higher",
  "odelpay_schools",
  "openpaygb",
  "developers",
];

export function productLineById(id: ProductLineId): ProductLine | undefined {
  return PRODUCT_LINES.find((p) => p.id === id);
}
