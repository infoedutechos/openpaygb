/**
 * Canonical OdelPay / OpenPayGB product lines (see docs/PAYMENT_SYSTEM_ARCHITECTURE.md).
 * Shown independently on the home lobby — not merged into a single "Tuition Hub" card.
 */

export type ProductLineId =
  | "odelpay_higher"
  | "odelpay_schools"
  | "assessmentverse_os"
  | "openpaygb"
  | "developers";

export type ProductLine = {
  id: ProductLineId;
  title: string;
  subtitle: string;
  description: string;
  audience: string;
  /** user = end-customer products; builder = developer / integrator surface */
  surface: "user" | "builder";
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  accent: "cyan" | "sky" | "violet" | "emerald" | "teal";
};

export const PRODUCT_LINES: ProductLine[] = [
  {
    id: "odelpay_higher",
    title: "OdelPay — Higher",
    subtitle: "Universities & tertiary",
    description:
      "Programme fees by semester, TON and mobile-money checkout, receipts, and school admin tooling for universities and polytechnics.",
    audience: "Universities, polytechnics, tertiary colleges",
    surface: "user",
    primaryHref: "/OdelPayUniversities",
    primaryLabel: "Open OdelPay Higher",
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
    surface: "user",
    primaryHref: "/OdelPaySchools",
    primaryLabel: "Open OdelPay Schools",
    secondaryHref: "/admin/register?segment=schools",
    secondaryLabel: "Request workspace",
    accent: "sky",
  },
  {
    id: "assessmentverse_os",
    title: "AssessmentVerse OS",
    subtitle: "Schools & Higher assessment platform",
    description:
      "Extensible assessment OS: report cards, class lists, grading, and auto-save editors. Independent of OdelPay tuition. Nursery, Primary, Secondary, and Higher stay on separate stages.",
    audience: "Primary schools, secondary schools, higher institutions, school admins and teachers",
    surface: "user",
    primaryHref: "/AssessmentVerseOS",
    primaryLabel: "Open AssessmentVerse OS",
    secondaryHref: "/help",
    secondaryLabel: "Help center",
    accent: "teal",
  },
  {
    id: "openpaygb",
    title: "OpenPayGB",
    subtitle: "Payment provider & global rails",
    description:
      "Accept payments in your own apps via Partner API + hosted checkout. Closed-loop UGX card, OPGB wallet, Dex, MoMo and TON — for consumers and integrators.",
    audience: "Merchants, product builders, students, parents & partners",
    surface: "user",
    primaryHref: "/opgb",
    primaryLabel: "Open OpenPayGB",
    secondaryHref: "/developers",
    secondaryLabel: "Get API keys",
    accent: "violet",
  },
  {
    id: "developers",
    title: "ODELPay HUB Developers",
    subtitle: "Builder portal · all product sides",
    description:
      "Partner API keys, webhooks, and app registry. Developers can navigate every user-facing product side; each portal still requires its own audience sign-in.",
    audience: "SIS vendors, fintech partners, OPGB app builders, platform engineers",
    surface: "builder",
    primaryHref: "/developers",
    primaryLabel: "Developer hub",
    secondaryHref: "/login",
    secondaryLabel: "Open user login chooser",
    accent: "emerald",
  },
];

export const PRODUCT_LINE_ORDER: ProductLineId[] = [
  "odelpay_higher",
  "odelpay_schools",
  "assessmentverse_os",
  "openpaygb",
  "developers",
];

export function productLineById(id: ProductLineId): ProductLine | undefined {
  return PRODUCT_LINES.find((p) => p.id === id);
}
