/**
 * Shared header dropdowns and footer column links (see docs/FOOTER_AND_HEADER_NAV.md).
 * Public menus must not link to localhost or demo-only surfaces.
 */

export type SiteNavLink = {
  label: string;
  href: string;
  description?: string;
};

export type SiteNavMenu = {
  id: "odelpay_higher" | "odelpay_schools" | "assessmentverse_os" | "openpaygb" | "developers" | "hubs";
  label: string;
  href: string;
  accent: "cyan" | "sky" | "violet" | "emerald" | "amber" | "teal";
  items: SiteNavLink[];
};

export type SiteFooterColumn = {
  heading: string;
  links: SiteNavLink[];
};

export type SiteHeaderUtilityLink = {
  label: string;
  href: string;
  title?: string;
  variant?: "default" | "accent" | "admin";
  signedInHref?: string;
  signedInLabel?: string;
};

/** Flat header links after product-line dropdowns (single-row nav). */
export const SITE_HEADER_UTILITY_LINKS: SiteHeaderUtilityLink[] = [
  { label: "Pay tuition", href: "/pay", title: "Choose your school, then pay tuition" },
  {
    label: "Register school",
    href: "/admin/register",
    variant: "accent",
    title: "Self-register your school on our platform",
  },
  {
    label: "Log in",
    href: "/login",
    signedInHref: "/my/dashboard",
    signedInLabel: "My dashboard",
    title: "User sign-in: student, staff, or school/institution admin",
  },
  {
    label: "School admin",
    href: "/admin",
    variant: "admin",
    title: "Tuition hub for school / institution admins (not the developer portal)",
  },
];

export const SITE_HEADER_MENUS: SiteNavMenu[] = [
  {
    id: "odelpay_higher",
    label: "OdelPay — Higher",
    href: "/OdelPayUniversities",
    accent: "cyan",
    items: [
      { label: "Universities lobby", href: "/OdelPayUniversities", description: "Active higher-ed workspaces" },
      { label: "Pay tuition", href: "/pay", description: "Choose institution and checkout" },
      { label: "Programmes & fees", href: "/pay/default?programmes=1", description: "Browse programme catalog" },
      { label: "Receipts", href: "/receipt", description: "Payment receipts and ledger" },
      { label: "Institution admin", href: "/school/login", description: "School / org admin sign-in" },
      { label: "Register higher institution", href: "/admin/register?segment=higher", description: "Request a workspace" },
      { label: "Student guide (higher)", href: "/help/guide-student-higher", description: "Year/semester portal handbook" },
      { label: "Staff guide (higher)", href: "/help/guide-staff-higher", description: "Staff ID portal & salary" },
      { label: "Admin guide (higher)", href: "/help/guide-admin-higher", description: "Programmes, fees & students" },
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
      { label: "Request workspace", href: "/admin/register?segment=schools", description: "Self-register your school" },
      { label: "Workspace status", href: "/school/workspace-status", description: "Track registration approval" },
      { label: "School admin", href: "/school/login", description: "Programmes, students, payments" },
      { label: "Student guide (schools)", href: "/help/guide-student-schools", description: "Term fees & School Code" },
      { label: "Staff guide (schools)", href: "/help/guide-staff-schools", description: "Staff ID portal & salary" },
      { label: "Admin guide (schools)", href: "/help/guide-admin-schools", description: "Sessions, bills & letterhead" },
    ],
  },
  {
    id: "assessmentverse_os",
    label: "AssessmentVerse OS",
    href: "/AssessmentVerseOS",
    accent: "teal",
    items: [
      { label: "AssessmentVerse lobby", href: "/AssessmentVerseOS", description: "Overview on ODELPay HUB" },
      { label: "Help center", href: "/help", description: "Guides and support" },
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
      { label: "Developer hub (builder portal)", href: "/developers", description: "Partner API · faces all sides" },
      { label: "Register app", href: "/developers/register", description: "Self-serve OAuth app registry" },
      { label: "API dashboard", href: "/developers/dashboard", description: "API keys & webhooks" },
      { label: "User login chooser", href: "/login", description: "Open every user-facing sign-in" },
      { label: "Partner API docs", href: "/help/partner-api-overview", description: "Payments & webhooks" },
      { label: "Dex integration FAQ", href: "/help?hub=dex", description: "OPGB / Dex help articles" },
    ],
  },
  {
    id: "hubs",
    label: "Hubs",
    href: "/dex",
    accent: "amber",
    items: [
      { label: "Dex Hub", href: "/dex", description: "Buy, swap, P2P, offramp" },
      { label: "Play Hub", href: "/play", description: "Games — MAC active launch URL or built-in clicker" },
      { label: "Tuition pay", href: "/pay", description: "Choose school and pay fees" },
    ],
  },
];

/** Footer columns — one job per column; no localhost or duplicate Help/guide spam. */
export const SITE_FOOTER_COLUMNS: SiteFooterColumn[] = [
  {
    heading: "OdelPay — Higher",
    links: [
      { label: "Universities lobby", href: "/OdelPayUniversities" },
      { label: "Pay tuition", href: "/pay" },
      { label: "Programmes", href: "/pay/default?programmes=1" },
      { label: "Receipts", href: "/receipt" },
      { label: "Register institution", href: "/admin/register?segment=higher" },
      { label: "Institution admin", href: "/school/login" },
    ],
  },
  {
    heading: "OdelPay — Schools",
    links: [
      { label: "Schools lobby", href: "/OdelPaySchools" },
      { label: "Request workspace", href: "/admin/register?segment=schools" },
      { label: "Workspace status", href: "/school/workspace-status" },
      { label: "School admin", href: "/school/login" },
      { label: "Pay school fees", href: "/pay" },
    ],
  },
  {
    heading: "AssessmentVerse OS",
    links: [
      { label: "AssessmentVerse lobby", href: "/AssessmentVerseOS" },
      { label: "Help center", href: "/help" },
    ],
  },
  {
    heading: "Guides",
    links: [
      { label: "All user guides", href: "/api/docs/guides/USER_GUIDE_INDEX.md" },
      { label: "Student guide (schools)", href: "/help/guide-student-schools" },
      { label: "Student guide (higher)", href: "/help/guide-student-higher" },
      { label: "Staff guide (schools)", href: "/help/guide-staff-schools" },
      { label: "Staff guide (higher)", href: "/help/guide-staff-higher" },
      { label: "Admin guide (schools)", href: "/help/guide-admin-schools" },
      { label: "Admin guide (higher)", href: "/help/guide-admin-higher" },
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Help center", href: "/help" },
      { label: "Student sign in", href: "/student/login" },
      { label: "My dashboard", href: "/my/dashboard" },
      { label: "Log in", href: "/login" },
      { label: "Developer hub", href: "/developers" },
      { label: "Register integrator app", href: "/developers/register" },
      { label: "Master console", href: "/admin/login?master=1" },
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
    ],
  },
];
