/** Beautiful inline SVG icons for collapsible dashboard sidebars (no extra deps). */

import type { ReactNode } from "react";

export const SIDEBAR_ICON_IDS = [
  "dashboard",
  "profile",
  "card",
  "session",
  "terms",
  "advertise",
  "accounts",
  "structure",
  "programmes",
  "students",
  "register",
  "ledger",
  "fees",
  "golive",
  "defaulters",
  "cashbook",
  "attendance",
  "quran",
  "exams",
  "audit",
  "receipts",
  "requests",
  "cards",
  "staff",
  "outflow",
  "settlement",
  "inventory",
  "reports",
  "payments",
  "users",
  "settings",
  "balance",
  "pay",
  "lobby",
  "dex",
  "home",
  "salary",
  "orgs",
  "docs",
  "backup",
  "env",
  "demo",
  "visitors",
  "branding",
  "auth",
  "cron",
  "momo",
  "network",
  "providers",
  "partner",
  "chat",
  "ads",
  "knowledge",
  "social",
  "guides",
  "dev",
  "api",
  "woo",
  "shield",
] as const;

export type SidebarIconId = (typeof SIDEBAR_ICON_IDS)[number];

export function isSidebarIconId(v: string): v is SidebarIconId {
  return (SIDEBAR_ICON_IDS as readonly string[]).includes(v);
}

type IconProps = { className?: string };

function strokeIcon(
  paths: ReactNode,
  { className }: IconProps,
) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      {paths}
    </svg>
  );
}

const sw = 1.7;

export function SidebarNavIcon({
  id,
  className = "h-5 w-5",
}: {
  id: SidebarIconId | string;
  className?: string;
}) {
  const p = { className };
  switch (id as SidebarIconId) {
    case "dashboard":
    case "home":
      return strokeIcon(
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />,
        p,
      );
    case "profile":
    case "users":
      return strokeIcon(
        <>
          <circle cx="12" cy="8.5" r="3.25" stroke="currentColor" strokeWidth={sw} />
          <path d="M5 19.5c0-3.2 2.9-5.5 7-5.5s7 2.3 7 5.5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "card":
    case "cards":
      return strokeIcon(
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2.2" stroke="currentColor" strokeWidth={sw} />
          <path d="M3 10h18" stroke="currentColor" strokeWidth={sw} />
          <path d="M7 15h5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "session":
      return strokeIcon(
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>,
        p,
      );
    case "terms":
      return strokeIcon(
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "advertise":
    case "ads":
      return strokeIcon(
        <>
          <path d="M4 9.5v5c0 .8.7 1.5 1.5 1.5H9l4.5 3V5L9 8H5.5C4.7 8 4 8.7 4 9.5Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7.5a6.5 6.5 0 0 1 0 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "accounts":
      return strokeIcon(
        <>
          <ellipse cx="12" cy="6.5" rx="7" ry="2.5" stroke="currentColor" strokeWidth={sw} />
          <path d="M5 6.5v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 10.5v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" stroke="currentColor" strokeWidth={sw} />
        </>,
        p,
      );
    case "structure":
      return strokeIcon(
        <>
          <rect x="9" y="3" width="6" height="5" rx="1" stroke="currentColor" strokeWidth={sw} />
          <rect x="3.5" y="16" width="6" height="5" rx="1" stroke="currentColor" strokeWidth={sw} />
          <rect x="14.5" y="16" width="6" height="5" rx="1" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 8v4M12 12H6.5v4M12 12h5.5v4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "programmes":
    case "docs":
    case "guides":
      return strokeIcon(
        <>
          <path d="M4 19V5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2Zm10 0V3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M9 8h2M9 12h2M17 8h2M17 12h2" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        </>,
        p,
      );
    case "students":
    case "register":
      return strokeIcon(
        <>
          <circle cx="9" cy="8" r="2.75" stroke="currentColor" strokeWidth={sw} />
          <circle cx="16.5" cy="9" r="2.25" stroke="currentColor" strokeWidth={sw} />
          <path d="M3.5 18.5c.4-2.6 2.5-4.5 5.5-4.5s5.1 1.9 5.5 4.5M14 14.2c1.3-.5 2.8-.3 4 .7 1 .8 1.5 2 1.6 3.1" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "ledger":
    case "fees":
      return strokeIcon(
        <>
          <rect x="4" y="3.5" width="16" height="17" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "golive":
      return strokeIcon(
        <>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.9" />
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth={sw} opacity="0.7" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "defaulters":
      return strokeIcon(
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 7.5v5.5M12 16.5h.01" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "cashbook":
      return strokeIcon(
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M3.5 10h17M8 14h3" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "attendance":
      return strokeIcon(
        <>
          <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth={sw} />
          <path d="M8 12.5 10.5 15 16 9" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>,
        p,
      );
    case "quran":
      return strokeIcon(
        <>
          <path d="M5 5.5c2.2-1.2 4.5-1.5 7-1.5s4.8.3 7 1.5v13c-2.2-1-4.5-1.4-7-1.4s-4.8.4-7 1.4v-13Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M12 4v13" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        </>,
        p,
      );
    case "exams":
      return strokeIcon(
        <>
          <path d="M8 3.5h8l.5 3H7.5L8 3.5Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <rect x="5.5" y="6.5" width="13" height="14" rx="1.5" stroke="currentColor" strokeWidth={sw} />
          <path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "audit":
      return strokeIcon(
        <>
          <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth={sw} />
          <path d="M15 15.5 20 20.5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "receipts":
      return strokeIcon(
        <>
          <path d="M7 3h10l3 3v16l-2.5-1.5L15 22l-2.5-1.5L10 22l-2.5-1.5L5 22V6l2-3Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "requests":
      return strokeIcon(
        <>
          <path d="M5 6.5h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-11Z" stroke="currentColor" strokeWidth={sw} />
          <path d="M9 3.5h6v3H9v-3Z" stroke="currentColor" strokeWidth={sw} />
          <path d="M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "staff":
      return strokeIcon(
        <>
          <circle cx="8.5" cy="8" r="2.5" stroke="currentColor" strokeWidth={sw} />
          <circle cx="15.5" cy="8.5" r="2.2" stroke="currentColor" strokeWidth={sw} />
          <path d="M3.5 18c.3-2.4 2.2-4 5-4s4.7 1.6 5 4M13.5 14.5c1.4-.4 3-.2 4.2 1 .9.9 1.4 2.1 1.5 3.2" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "outflow":
      return strokeIcon(
        <>
          <path d="M12 5v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 19h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity="0.65" />
        </>,
        p,
      );
    case "settlement":
    case "balance":
      return strokeIcon(
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 7.5v9M9.5 9.5c.6-1 1.7-1.5 2.5-1.5 1.4 0 2.5.8 2.5 2s-1.1 2-2.5 2c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2c.9 0 1.9-.5 2.5-1.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "inventory":
      return strokeIcon(
        <>
          <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M12 12v8M4 8.5l8 3.5 8-3.5" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
        </>,
        p,
      );
    case "reports":
      return strokeIcon(
        <>
          <path d="M4 19V9l4 3 4-6 4 5 4-3v11H4Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M4 19h16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "payments":
    case "pay":
      return strokeIcon(
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M3 10h18" stroke="currentColor" strokeWidth={sw} />
          <path d="M7 15h4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "settings":
    case "env":
      return strokeIcon(
        <>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "lobby":
      return strokeIcon(
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />,
        p,
      );
    case "dex":
      return strokeIcon(
        <>
          <path d="M7 8.5 12 4l5 4.5M7 15.5 12 20l5-4.5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 12h7" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </>,
        p,
      );
    case "salary":
      return strokeIcon(
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "orgs":
      return strokeIcon(
        <>
          <rect x="3.5" y="9" width="7" height="11" rx="1.2" stroke="currentColor" strokeWidth={sw} />
          <rect x="13.5" y="4" width="7" height="16" rx="1.2" stroke="currentColor" strokeWidth={sw} />
          <path d="M5.5 12h3M5.5 15h3M15.5 8h3M15.5 11h3M15.5 14h3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
        </>,
        p,
      );
    case "backup":
      return strokeIcon(
        <>
          <path d="M7 18a5 5 0 0 1 1-9.9A6 6 0 0 1 19.5 11 3.5 3.5 0 0 1 18 18H7Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M12 13v5m0 0-2-2m2 2 2-2" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>,
        p,
      );
    case "demo":
      return strokeIcon(
        <>
          <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M10 9.5v4l4-2-4-2Z" fill="currentColor" />
          <path d="M8 19h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "visitors":
      return strokeIcon(
        <>
          <path d="M4 18V9l4 2.5L12 6l4 4 4-2.5V18H4Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
        </>,
        p,
      );
    case "branding":
      return strokeIcon(
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={sw} />
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        </>,
        p,
      );
    case "auth":
      return strokeIcon(
        <>
          <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M9 10V7.5a3 3 0 0 1 6 0V10" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <circle cx="12" cy="15" r="1.2" fill="currentColor" />
        </>,
        p,
      );
    case "cron":
      return strokeIcon(
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>,
        p,
      );
    case "momo":
      return strokeIcon(
        <>
          <rect x="7" y="3" width="10" height="18" rx="2.5" stroke="currentColor" strokeWidth={sw} />
          <path d="M10 6.5h4M11 17.5h2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>,
        p,
      );
    case "network":
      return strokeIcon(
        <>
          <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth={sw} />
          <circle cx="18" cy="7" r="2.2" stroke="currentColor" strokeWidth={sw} />
          <circle cx="18" cy="17" r="2.2" stroke="currentColor" strokeWidth={sw} />
          <path d="M8.1 11.2 15.9 8M8.1 12.8 15.9 16" stroke="currentColor" strokeWidth={sw} />
        </>,
        p,
      );
    case "providers":
      return strokeIcon(
        <>
          <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth={sw} />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth={sw} />
        </>,
        p,
      );
    case "partner":
    case "api":
    case "dev":
      return strokeIcon(
        <>
          <path d="M8 8.5 4.5 12 8 15.5M16 8.5 19.5 12 16 15.5M13.5 6.5l-3 11" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </>,
        p,
      );
    case "chat":
      return strokeIcon(
        <>
          <path d="M5 6.5h14a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H10l-4 3v-3H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
        </>,
        p,
      );
    case "knowledge":
      return strokeIcon(
        <>
          <path d="M5 5.5c2-1 4.2-1.3 7-1.3s5 .3 7 1.3v13c-2-.9-4.2-1.3-7-1.3s-5 .4-7 1.3v-13Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M12 4.2v13" stroke="currentColor" strokeWidth={1.4} />
        </>,
        p,
      );
    case "social":
      return strokeIcon(
        <>
          <circle cx="7.5" cy="10" r="2.3" stroke="currentColor" strokeWidth={sw} />
          <circle cx="16.5" cy="7.5" r="2.3" stroke="currentColor" strokeWidth={sw} />
          <circle cx="16.5" cy="16" r="2.3" stroke="currentColor" strokeWidth={sw} />
          <path d="M9.5 9.3 14.3 7.8M9.6 11.2 14.3 15" stroke="currentColor" strokeWidth={sw} />
        </>,
        p,
      );
    case "woo":
      return strokeIcon(
        <>
          <path d="M4 8h16l-1.5 10.5a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 8Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth={sw} />
        </>,
        p,
      );
    case "shield":
    default:
      return strokeIcon(
        <path
          d="M12 2.5 4.25 6v5.92c0 4.72 3.06 9.06 7.75 10.54a.93.93 0 0 0 .5 0C17.69 21.06 20.75 16.73 20.75 12V6L12 2.5Z"
          stroke="currentColor"
          strokeWidth={sw}
          strokeLinejoin="round"
        />,
        p,
      );
  }
}

export const SIDEBAR_ICON_LABELS: Record<SidebarIconId, string> = {
  dashboard: "Dashboard",
  profile: "Profile",
  card: "Card",
  session: "Session",
  terms: "Terms",
  advertise: "Advertise",
  accounts: "Accounts",
  structure: "Structure",
  programmes: "Programmes",
  students: "Students",
  register: "Register",
  ledger: "Ledger",
  fees: "Fees",
  golive: "Go-live",
  defaulters: "Alert",
  cashbook: "Cashbook",
  attendance: "Attendance",
  quran: "Qur'an",
  exams: "Exams",
  audit: "Audit / search",
  receipts: "Receipts",
  requests: "Requests",
  cards: "Cards",
  staff: "Staff",
  outflow: "Outflow",
  settlement: "Settlement",
  inventory: "Inventory",
  reports: "Reports",
  payments: "Payments",
  users: "Users",
  settings: "Settings",
  balance: "Balance",
  pay: "Pay",
  lobby: "Lobby",
  dex: "Dex",
  home: "Home",
  salary: "Salary",
  orgs: "Organizations",
  docs: "Docs",
  backup: "Backup",
  env: "Environment",
  demo: "Demo",
  visitors: "Visitors",
  branding: "Branding",
  auth: "Auth / lock",
  cron: "Cron / clock",
  momo: "Mobile",
  network: "Network",
  providers: "Providers",
  partner: "Partner",
  chat: "Chat",
  ads: "Ads",
  knowledge: "Knowledge",
  social: "Social",
  guides: "Guides",
  dev: "Developer",
  api: "API / code",
  woo: "Commerce",
  shield: "Shield",
};
