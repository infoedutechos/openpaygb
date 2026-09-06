"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CollapsibleNavLink } from "@/components/nav/CollapsibleNavLink";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { DashboardGuideNavLinks } from "@/components/nav/DashboardGuideNavLinks";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { SidebarCollapseToggle } from "@/components/nav/SidebarCollapseToggle";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";
import { DEX_SIDEBAR_NAV, pathnameIsDexHub } from "@/lib/dex-nav";
import { AUDIENCE_GUIDE_LIST, USER_GUIDES_INDEX_HREF } from "@/lib/audience-guides";
import { OPERATOR_ALL_SIDES_LINKS } from "@/lib/access-surfaces";
import { OperatorAllSidesNav } from "@/components/nav/OperatorAllSidesNav";

const nav: { href: string; label: string; desc?: string }[] = [
  { href: "/admin/master", label: "Overview", desc: "Platform totals" },
  {
    href: "/admin/master/organizations",
    label: "Organizations",
    desc: "Tenants, favicons, per-school fee",
  },
  {
    href: "/admin/master/programmes",
    label: "Programmes",
    desc: "Years & semesters per year",
  },
  {
    href: "/admin/master/tuition-balance",
    label: "Tuition balance",
    desc: "Paid & remaining by student",
  },
  {
    href: "/admin/master/opgb-ops",
    label: "OPGB console",
    desc: "Fees, cards, charges, cashouts, ops",
  },
  {
    href: "/admin/master#project-download",
    label: "Docs & downloads",
    desc: "Categorised project downloadables",
  },
  {
    href: "/admin/my-card",
    label: "My OpenPayGB Card",
    desc: "Personal card · MoMo / TON",
  },
  {
    href: "/admin/virtual-cards",
    label: "OpenPayGB Cards",
    desc: "Org registry · all holders",
  },
  {
    href: "/admin/master#openpay-cards-overview",
    label: "Cards (platform)",
    desc: "Cross-tenant OpenPayGB overview",
  },
  {
    href: DEX_SIDEBAR_NAV.href,
    label: DEX_SIDEBAR_NAV.label,
    desc: "Buy · swap · P2P · offramp",
  },
  {
    href: "/admin/master#platform-communications",
    label: "Chat & notifications",
    desc: "Bell + ODEL HUB Copilot",
  },
  {
    href: "/admin/master#ads-console",
    label: "Ads platform",
    desc: "Campaigns · placements · approval",
  },
  {
    href: "/admin/master#knowledge-base",
    label: "Knowledge base",
    desc: "Copilot articles",
  },
  {
    href: "/admin/master#platform-social",
    label: "Social & share",
    desc: "Links, support, share copy",
  },
  {
    href: "/admin/master#system-backup",
    label: "Backup",
    desc: "Live JSON export",
  },
  {
    href: "/admin/master#deployment-environment",
    label: "Environment",
    desc: "Deployment env audit",
  },
  {
    href: "/admin/master#demo-logins",
    label: "Demo logins",
    desc: "Customise, publish & download demos",
  },
  {
    href: "/admin/master#visitor-analytics",
    label: "Visitors",
    desc: "Daily · total · countries",
  },
  {
    href: "/admin/master#platform-branding",
    label: "Branding",
    desc: "Name, SEO, hero, accent",
  },
  {
    href: "/admin/master#sidebar-nav-icons",
    label: "Sidebar icons",
    desc: "Dashboard icon set (MAC)",
  },
  {
    href: "/admin/master#auth-session-policy",
    label: "Auth policy",
    desc: "Sessions & payment TTL",
  },
  {
    href: "/admin/master#cron-ops",
    label: "Cron ops",
    desc: "Scheduled jobs · run now",
  },
  {
    href: "/admin/master#ug-momo-credentials",
    label: "UG MoMo keys",
    desc: "LivePay · Relworx · VixonPay",
  },
  {
    href: "/admin/master#card-network",
    label: "Card network",
    desc: "Acquiring + Visa issuing",
  },
  {
    href: "/admin/master#payment-providers",
    label: "Payment providers",
    desc: "PSP APIs & toggles",
  },
  {
    href: "/admin/master#mobile-money-providers",
    label: "Mobile money",
    desc: "Custom PSP webhooks",
  },
  {
    href: "/admin/master#partner-integrations",
    label: "Partner API",
    desc: "Keys & webhooks out",
  },
  {
    href: "/docs",
    label: "Documentation",
    desc: "Searchable docs library",
  },
  {
    href: USER_GUIDES_INDEX_HREF,
    label: "User guides",
    desc: "Audience handbooks (students · staff · admins)",
  },
];

import type { SidebarIconId } from "@/components/nav/sidebar-nav-icons";

function masterIconForHref(href: string): { navKey: string; iconId: SidebarIconId } {
  if (href.includes("dex")) return { navKey: "shared.dex", iconId: "dex" };
  let rest = href;
  if (rest.startsWith("/admin/master")) rest = rest.slice("/admin/master".length);
  else if (rest.startsWith("/admin/")) rest = rest.slice("/admin/".length);
  else rest = rest.replace(/^\//, "");
  const hashIdx = rest.indexOf("#");
  const pathPart = (hashIdx >= 0 ? rest.slice(0, hashIdx) : rest).replace(/^\//, "");
  const hashPart = hashIdx >= 0 ? rest.slice(hashIdx + 1) : "";
  let slug = (hashPart || pathPart || "overview").replace(/^\//, "") || "overview";
  if (slug.includes("USER_GUIDE") || href.includes("/guides/") || href.includes("user-guides")) {
    slug = "user-guides";
  } else if (href === "/docs" || slug === "docs") {
    slug = "docs";
  }
  const navKey = `mac.${slug}`;
  const table: Record<string, SidebarIconId> = {
    overview: "dashboard",
    organizations: "orgs",
    programmes: "programmes",
    "tuition-balance": "balance",
    "opgb-ops": "settlement",
    "project-download": "docs",
    "my-card": "card",
    "virtual-cards": "cards",
    "openpay-cards-overview": "cards",
    "platform-communications": "chat",
    "ads-console": "ads",
    "knowledge-base": "knowledge",
    "platform-social": "social",
    "system-backup": "backup",
    "deployment-environment": "env",
    "demo-logins": "demo",
    "visitor-analytics": "visitors",
    "platform-branding": "branding",
    "sidebar-nav-icons": "branding",
    "auth-session-policy": "auth",
    "cron-ops": "cron",
    "ug-momo-credentials": "momo",
    "card-network": "network",
    "payment-providers": "providers",
    "mobile-money-providers": "momo",
    "partner-integrations": "partner",
    docs: "docs",
    "user-guides": "guides",
  };
  return { navKey, iconId: table[slug] ?? "shield" };
}

function navActive(pathname: string, href: string): boolean {
  if (href === DEX_SIDEBAR_NAV.href) return pathnameIsDexHub(pathname);
  if (href === "/admin/master") return pathname === "/admin/master";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MasterManagerShell({
  children,
  dbUnavailable = false,
}: {
  children: React.ReactNode;
  dbUnavailable?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: authMe } = useAuthMe();
  const adminWelcomeName =
    authMe?.admin?.name?.trim() || authMe?.admin?.email?.trim() || null;
  const { collapsed, toggle } = useCollapsibleSidebar("odelhub-master-sidebar-collapsed");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login?master=1");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-1px)] flex-col bg-[#08070a] text-slate-200">
      {dbUnavailable ? (
        <div
          role="status"
          className="border-b border-amber-500/30 bg-amber-950/50 px-4 py-2 text-center text-xs text-amber-100"
        >
          Database is temporarily unreachable (MongoDB Atlas). Retry in a few seconds or check your network / IP
          allowlist. Pages may load with limited data until the connection recovers.
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
      <aside
        className={`hidden shrink-0 flex-col border-r border-amber-500/15 bg-gradient-to-b from-[#15100c] to-[#0a0806] py-4 transition-[width] duration-200 md:flex ${
          collapsed ? "w-14 items-center px-1.5" : "w-56 pl-4 pr-2"
        }`}
      >
        <div className={`mb-4 flex w-full items-start ${collapsed ? "justify-center" : "justify-between gap-2 px-2"}`}>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">Master</p>
              <p className="mt-1 text-sm font-medium text-white">Manager console</p>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">ODEL HUB platform</p>
            </div>
          ) : null}
          <SidebarCollapseToggle collapsed={collapsed} onToggle={toggle} accent="amber" />
        </div>
        {!collapsed && adminWelcomeName ? (
          <div className="mb-4 px-2">
            <WelcomeBackStrip
              name={adminWelcomeName}
              role="master"
              previousLoginAt={authMe?.admin?.previousLoginAt}
              className="border-amber-500/20 bg-amber-950/20"
            />
          </div>
        ) : null}

        <nav className={`flex flex-1 flex-col gap-0.5 overflow-y-auto text-sm ${collapsed ? "items-center" : ""}`}>
          {nav.map((item) => {
            const meta = masterIconForHref(item.href);
            return (
              <CollapsibleNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                subtitle={!collapsed ? item.desc : undefined}
                navKey={meta.navKey}
                iconId={meta.iconId}
                collapsed={collapsed}
                active={navActive(pathname, item.href)}
                accent="amber"
              />
            );
          })}
          {!collapsed ? (
            <>
              <DashboardChatNavButton variant="master" />
              <DashboardGuideNavLinks guides={AUDIENCE_GUIDE_LIST} />
            </>
          ) : null}
        </nav>

        {!collapsed ? (
          <>
            <div className="mt-6 space-y-1 border-t border-amber-500/10 px-2 pt-4">
              <p className="px-3 text-[10px] uppercase tracking-wider text-slate-600">All product sides</p>
              {OPERATOR_ALL_SIDES_LINKS.filter((l) => l.kind !== "master").map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-amber-100"
                >
                  {link.label}
                </Link>
              ))}
              <p className="px-3 pt-3 text-[10px] uppercase tracking-wider text-slate-600">Operations</p>
              <Link
                href="/admin/profile"
                className="block rounded-lg px-3 py-2 text-sm text-amber-200/85 hover:bg-amber-950/35 hover:text-amber-50"
              >
                Profile
                <span className="block text-[11px] text-slate-600">Account &amp; password</span>
              </Link>
              <Link
                href="/admin"
                className="block rounded-lg px-3 py-2 text-sm text-cyan-200/80 hover:bg-cyan-950/40 hover:text-cyan-100"
              >
                Tuition hub
                <span className="block text-[11px] text-slate-600">School admin view</span>
              </Link>
              <Link
                href="/developers"
                className="block rounded-lg px-3 py-2 text-sm text-emerald-200/80 hover:bg-emerald-950/40 hover:text-emerald-100"
              >
                Developers
                <span className="block text-[11px] text-slate-600">Builder portal</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="mx-2 mt-4 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-white/[0.04] hover:text-rose-200"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            type="button"
            title="Logout"
            onClick={() => void logout()}
            className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-rose-300/80 hover:bg-white/5"
          >
            ×
          </button>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-[#100c0a]/80 to-transparent">
        <DashboardMobileChrome
          title="Manager console"
          subtitle="Master · ODEL HUB platform"
          accent="amber"
          panelId="master-manager-mobile-menu"
          backHref={pathname === "/admin/master" || pathname === "/admin/master/" ? "/admin" : "/admin/master"}
          backLabel={pathname === "/admin/master" || pathname === "/admin/master/" ? "Tuition admin" : "Manager home"}
          items={nav.map((item) => ({
            href: item.href,
            label: item.label,
            description: item.desc,
            active: navActive(pathname, item.href),
          }))}
          secondarySections={[
            {
              id: "all-sides",
              label: "All product sides",
              items: OPERATOR_ALL_SIDES_LINKS.map((l) => ({
                href: l.href,
                label: l.label,
                description: l.description,
              })),
            },
            {
              id: "ops",
              label: "Operations",
              items: [
                { href: "/admin/profile", label: "Profile", description: "Account & password" },
                { href: "/admin", label: "Tuition hub", description: "School admin view" },
                { href: "/developers", label: "Developers", description: "Builder portal" },
              ],
            },
            {
              id: "guides",
              label: "Guides",
              items: AUDIENCE_GUIDE_LIST.map((g) => ({
                href: g.helpHref,
                label: g.dashboardLabel,
              })),
            },
          ]}
          afterSections={
            <>
              <DashboardChatNavButton variant="master" />
              <div className="mt-3 px-1">
                <OperatorAllSidesNav compact />
              </div>
            </>
          }
          trailing={
            <Link href="/admin" className="text-[11px] font-medium text-cyan-400/80">
              Tuition
            </Link>
          }
          footer={
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-200/90 hover:bg-white/[0.04]"
            >
              Logout
            </button>
          }
        />
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">{children}</div>
      </div>
      </div>
    </div>
  );
}
