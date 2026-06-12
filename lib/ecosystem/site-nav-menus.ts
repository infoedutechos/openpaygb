/**
 * Shared header dropdowns and footer column links (see docs/FOOTER_AND_HEADER_NAV.md).
 */

export type SiteNavLink = {
  label: string;
  href: string;
  description?: string;
};

export type SiteNavMenu = {
  id: "odelpay_higher" | "odelpay_schools" | "openpaygb" | "developers";
  label: string;
  href: string;
  accent: "cyan" | "sky" | "violet" | "emerald";
  items: SiteNavLink[];
};

export type SiteFooterColumn = {
  heading: string;
  links: SiteNavLink[];
};

export const SITE_HEADER_MENUS: SiteNavMenu[] = [
  {
    id: "odelpay_higher",
    label: "OdelPay — Higher Institutions",
    href: "/OdelPayUniversities",
    accent: "cyan",
    items: [
      { label: "Universities lobby", href: "/OdelPayUniversities", description: "Active higher-ed workspaces" },
      { label: "Pay tuition", href: "/pay", description: "Choose institution and checkout" },
      { label: "Programmes & fees", href: "/pay/default?programmes=1", description: "Browse programme catalog" },
      { label: "Receipts", href: "/receipt", description: "Payment receipts and ledger" },
      { label: "Institution admin", href: "/school/login", description: "School / org admin sign-in" },
      { label: "Register higher institution", href: "/admin/register?segment=higher", description: "Request a workspace" },
    ],
  },
  {
    id: "odelpay_schools",
    label: "OdelPay — Schools",
    href: "/OdelPaySchools",
    accent: "sky",
    items: [
      { label: "Schools lobby", href: "/OdelPaySchools", description: "Active primary & secondary tenants" },
      { label: "Pay school fees", href: "/pay", description: "Term-based checkout per school" },
      { label: "Demo school checkout", href: "/pay/riverside-demo", description: "Riverside Academy term fees" },
      { label: "Request workspace", href: "/admin/register?segment=schools", description: "Self-register your school" },
      { label: "Workspace status", href: "/school/workspace-status", description: "Track registration approval" },
      { label: "School admin", href: "/school/login", description: "Programmes, students, payments" },
    ],
  },
  {
    id: "openpaygb",
    label: "OPGB",
    href: "/opgb",
    accent: "violet",
    items: [
      { label: "OpenPayGB platform", href: "/opgb", description: "Global payments entry" },
      { label: "Dex Hub", href: "/dex", description: "Onramp, offramp, convert" },
      { label: "Buy crypto", href: "/dex/buy", description: "Fiat → crypto with live quote" },
      { label: "Sell crypto", href: "/dex/sell", description: "Crypto → UGX settlement preview" },
      { label: "Convert UGX ↔ TON", href: "/dex/convert", description: "Live FX conversion" },
      { label: "Student wallet", href: "/student/login", description: "OPGB balance & card" },
      { label: "OpenPayGB card", href: "/student/card", description: "Virtual card top-up" },
    ],
  },
  {
    id: "developers",
    label: "Developers",
    href: "/developers",
    accent: "emerald",
    items: [
      { label: "Developer hub", href: "/developers", description: "Partner API & OPGB integrators" },
      { label: "Register app", href: "/developers/register", description: "Self-serve OAuth app registry" },
      { label: "Dashboard", href: "/developers/dashboard", description: "API keys & webhooks" },
      { label: "Dex integration FAQ", href: "/help?hub=dex", description: "OPGB / Dex help articles" },
      { label: "Partner API docs", href: "/help/partner-api-overview", description: "Payments & webhooks" },
    ],
  },
];

/** Footer columns inspired by multi-column exchange footers (Atlantis Pro reference). */
export const SITE_FOOTER_COLUMNS: SiteFooterColumn[] = [
  {
    heading: "OdelPay — Higher",
    links: [
      { label: "Universities lobby", href: "/OdelPayUniversities" },
      { label: "Pay tuition", href: "/pay" },
      { label: "Programmes", href: "/pay/default?programmes=1" },
      { label: "Receipts", href: "/receipt" },
      { label: "Register institution", href: "/admin/register?segment=higher" },
    ],
  },
  {
    heading: "OdelPay — Schools",
    links: [
      { label: "Schools lobby", href: "/OdelPaySchools" },
      { label: "Request workspace", href: "/admin/register?segment=schools" },
      { label: "Workspace status", href: "/school/workspace-status" },
      { label: "School admin", href: "/school/login" },
      { label: "Demo term checkout", href: "/pay/riverside-demo" },
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Help center", href: "/help" },
      { label: "Student sign in", href: "/student/login" },
      { label: "My dashboard", href: "/my/dashboard" },
      { label: "Master console", href: "/admin/login?master=1" },
      { label: "API health", href: "/api/health" },
      { label: "Developer dashboard", href: "/developers" },
      { label: "Register integrator app", href: "/developers/register" },
    ],
  },
  {
    heading: "OpenPayGB & Dex",
    links: [
      { label: "OPGB platform", href: "/opgb" },
      { label: "Dex Hub", href: "/dex" },
      { label: "Buy crypto", href: "/dex/buy" },
      { label: "Sell crypto", href: "/dex/sell" },
      { label: "Convert", href: "/dex/convert" },
      { label: "Offramp / withdraw", href: "/dex/offramp" },
      { label: "P2P market", href: "/dex/p2p" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { label: "Platform Terms of Service", href: "/policies/terms" },
      { label: "Platform Privacy Policy", href: "/policies/privacy" },
      { label: "Risk Disclosure", href: "/policies/risk-disclosure" },
      { label: "Payment Provider Policy", href: "/policies/payment-providers" },
      { label: "Help", href: "/help" },
    ],
  },
];
