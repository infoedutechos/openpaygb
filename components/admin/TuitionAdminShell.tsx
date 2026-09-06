"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";
import { AdminWorkspaceBar } from "@/components/admin/AdminWorkspaceBar";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { invalidateAuthMeCache, useAuthMe } from "@/hooks/useAuthMe";
import { DbDegradedBanner } from "@/components/admin/DbDegradedBanner";
import { WorkspaceEmailUnverifiedBanner } from "@/components/admin/WorkspaceEmailUnverifiedBanner";
import { CollapsibleNavLink } from "@/components/nav/CollapsibleNavLink";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { DashboardGuideNavLinks } from "@/components/nav/DashboardGuideNavLinks";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { DashboardNotificationBell } from "@/components/nav/DashboardNotificationBell";
import { SidebarCollapseToggle } from "@/components/nav/SidebarCollapseToggle";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { adminRoleToProfileRole } from "@/lib/profile-mappers";
import { DEX_SIDEBAR_NAV, pathnameIsDexHub } from "@/lib/dex-nav";
import { SchoolContextBar } from "@/components/admin/school/SchoolContextBar";
import { AdSlot } from "@/components/ads/AdSlot";
import { adminGuideForTier, AUDIENCE_GUIDES } from "@/lib/audience-guides";

import type { SidebarIconId } from "@/components/nav/sidebar-nav-icons";

const UNIVERSITY_SEGMENTS: { suffix: string; label: string; iconId: SidebarIconId; schoolOnly?: boolean }[] = [
  { suffix: "", label: "Dashboard", iconId: "dashboard" },
  { suffix: "/profile", label: "Profile", iconId: "profile" },
  { suffix: "/my-card", label: "My OpenPayGB Card", iconId: "card" },
  { suffix: "/tuition-balance", label: "Tuition balance", iconId: "balance" },
  { suffix: "/students", label: "Students", iconId: "students" },
  { suffix: "/school-structure", label: "Classes & streams", iconId: "structure", schoolOnly: true },
  { suffix: "/payments", label: "Payments", iconId: "payments" },
  { suffix: "/payment-requests", label: "Payment requests", iconId: "requests" },
  { suffix: "/virtual-cards", label: "OpenPayGB Cards", iconId: "cards" },
  { suffix: "/school-staff", label: "Staff", iconId: "staff" },
  { suffix: "/programmes", label: "Programs", iconId: "programmes" },
  { suffix: "/receipts", label: "Receipts", iconId: "receipts" },
  { suffix: "/reports", label: "Reports", iconId: "reports" },
  { suffix: "/users", label: "Users", iconId: "users" },
  { suffix: "/settings", label: "Settings", iconId: "settings" },
];

const SCHOOL_ERP_SEGMENTS: { suffix: string; label: string; iconId: SidebarIconId }[] = [
  { suffix: "/school-dashboard", label: "Dashboard", iconId: "dashboard" },
  { suffix: "/profile", label: "Profile", iconId: "profile" },
  { suffix: "/my-card", label: "My OpenPayGB Card", iconId: "card" },
  { suffix: "/school-session", label: "Session", iconId: "session" },
  { suffix: "/school-terms", label: "Set Terms", iconId: "terms" },
  { suffix: "/school-advertise", label: "Advertise", iconId: "advertise" },
  { suffix: "/school-accounts", label: "Accounts", iconId: "accounts" },
  { suffix: "/school-structure", label: "Class registration", iconId: "structure" },
  { suffix: "/programmes", label: "Fee programmes", iconId: "programmes" },
  { suffix: "/students", label: "Students / bills", iconId: "students" },
  { suffix: "/students-register", label: "Students Register", iconId: "register" },
  { suffix: "/fee-ledger", label: "Fee ledger", iconId: "ledger" },
  { suffix: "/fee-structure", label: "Fee structure", iconId: "fees" },
  { suffix: "/school-golive", label: "Go-live", iconId: "golive" },
  { suffix: "/defaulters", label: "Defaulters", iconId: "defaulters" },
  { suffix: "/school-cashbook", label: "Cashbook", iconId: "cashbook" },
  { suffix: "/school-attendance", label: "Attendance", iconId: "attendance" },
  { suffix: "/school-quran", label: "Qur'an progress", iconId: "quran" },
  { suffix: "/school-exams", label: "Examinations", iconId: "exams" },
  { suffix: "/school-audit", label: "Audit log", iconId: "audit" },
  { suffix: "/receipts", label: "Receipt of payments", iconId: "receipts" },
  { suffix: "/payment-requests", label: "Payment requests", iconId: "requests" },
  { suffix: "/virtual-cards", label: "OpenPayGB Cards", iconId: "cards" },
  { suffix: "/school-staff", label: "Staff", iconId: "staff" },
  { suffix: "/school-outflow", label: "Outflow", iconId: "outflow" },
  { suffix: "/school-settlement", label: "OPGB settlement", iconId: "settlement" },
  { suffix: "/school-inventory", label: "Inventory", iconId: "inventory" },
  { suffix: "/school-reports", label: "Reports", iconId: "reports" },
  { suffix: "/payments", label: "Online payments", iconId: "payments" },
  { suffix: "/users", label: "Users", iconId: "users" },
  { suffix: "/settings", label: "Settings", iconId: "settings" },
];

function suffixToNavKey(prefix: "school" | "uni", suffix: string): string {
  const slug = suffix.replace(/^\//, "") || "dashboard";
  return `${prefix}.${slug}`;
}

function navActive(pathname: string, href: string): boolean {
  if (href === DEX_SIDEBAR_NAV.href) return pathnameIsDexHub(pathname);
  const pathOnly = href.split("#")[0] ?? href;
  if (pathOnly.endsWith("/admin") || pathOnly.endsWith("/school-admin")) {
    return pathname === pathOnly;
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function TuitionAdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hrefWithOrgSlug, orgSlug } = useMasterOrgSlug();
  const { data: authMe } = useAuthMe();
  const base = pathname.startsWith("/school-admin") ? "/school-admin" : "/admin";
  const isMaster = authMe?.admin?.role === "master";
  const schoolName = authMe?.admin?.organization?.name?.trim() || null;
  const isSchoolAdmin = authMe?.admin?.role === "org_admin" && Boolean(schoolName);
  const isSchoolTenant = authMe?.admin?.organization?.institutionTier === "school";
  const showSchoolErp = isSchoolTenant || (isMaster && Boolean(orgSlug));
  const navItems = useMemo(() => {
    const prefix = showSchoolErp ? "school" : "uni";
    const segments = showSchoolErp
      ? SCHOOL_ERP_SEGMENTS
      : UNIVERSITY_SEGMENTS.filter((s) => !s.schoolOnly);
    return [
      ...segments.map((s) => ({
        href: hrefWithOrgSlug(`${base}${s.suffix}`),
        label: s.label,
        navKey: suffixToNavKey(prefix, s.suffix),
        iconId: s.iconId,
      })),
      ...(showSchoolErp
        ? []
        : [
            {
              href: DEX_SIDEBAR_NAV.href,
              label: DEX_SIDEBAR_NAV.label,
              navKey: "shared.dex",
              iconId: "dex" as SidebarIconId,
            },
          ]),
    ];
  }, [base, hrefWithOrgSlug, showSchoolErp]);
  const tenantLabel = !authMe?.admin
    ? authMe?.adminShellAccess
      ? "Tuition sign-in pending"
      : "Admin"
    : schoolName ?? (authMe.admin.role === "master" ? "Platform overview" : "Admin");
  const shellTitle = isSchoolAdmin ? schoolName! : "ODELPay HUB";
  const shellSubtitle = isSchoolAdmin ? "School dashboard" : tenantLabel;
  const adminWelcomeName =
    authMe?.admin?.name?.trim() || authMe?.admin?.email?.trim() || null;
  const adminWelcomeRole = authMe?.admin ? adminRoleToProfileRole(authMe.admin.role) : null;
  const guideLinks = useMemo(() => {
    if (isMaster) {
      return [AUDIENCE_GUIDES.admin_schools, AUDIENCE_GUIDES.admin_higher];
    }
    return [adminGuideForTier(authMe?.admin?.organization?.institutionTier)];
  }, [isMaster, authMe?.admin?.organization?.institutionTier]);
  const { collapsed, toggle } = useCollapsibleSidebar("odelhub-tuition-sidebar-collapsed");

  async function logout() {
    invalidateAuthMeCache();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    const next = pathname.startsWith("/school-admin") ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`${PUBLIC_SCHOOL_LOGIN_PATH}${next}`);
    router.refresh();
  }

  const mobileItems = navItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: navActive(pathname, item.href),
  }));

  return (
    <div className="flex min-h-[calc(100vh-1px)] bg-[#070d18] text-slate-200">
      <aside
        className={`hidden shrink-0 flex-col border-r border-white/10 bg-[#0a101f] py-4 text-slate-200 transition-[width] duration-200 md:flex ${
          collapsed ? "w-14 items-center px-1.5" : "w-56 pl-4 pr-2"
        }`}
      >
        <div
          className={`mb-4 flex w-full items-center ${collapsed ? "flex-col gap-2" : "gap-2 px-2 pb-2"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-100">
            <OdelShieldIcon className="h-5 w-5" />
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-wide text-white">ODELPay HUB</p>
              <p className="truncate text-xs text-slate-400" title={tenantLabel}>
                {tenantLabel}
              </p>
            </div>
          ) : null}
          <div className={`flex items-center gap-1.5 ${collapsed ? "flex-col" : ""}`}>
            <DashboardNotificationBell hub="admin" />
            <SidebarCollapseToggle collapsed={collapsed} onToggle={toggle} accent="cyan" />
          </div>
        </div>
        {!collapsed && adminWelcomeName && adminWelcomeRole ? (
          <div className="mb-4 px-2">
            <WelcomeBackStrip
              name={adminWelcomeName}
              role={adminWelcomeRole}
              previousLoginAt={authMe?.admin?.previousLoginAt}
            />
          </div>
        ) : null}
        <nav className={`flex flex-1 flex-col gap-0.5 text-sm ${collapsed ? "items-center" : ""}`}>
          {navItems.map((item) => (
            <CollapsibleNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              navKey={item.navKey}
              iconId={item.iconId}
              collapsed={collapsed}
              active={navActive(pathname, item.href)}
              accent="cyan"
            />
          ))}
          {!collapsed ? (
            <>
              <DashboardChatNavButton variant="tuition" />
              <DashboardGuideNavLinks guides={guideLinks} />
            </>
          ) : null}
        </nav>
        {!collapsed ? (
          <>
            {isMaster ? (
              <Link
                href="/admin/master"
                className="mx-2 mt-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-100 hover:border-amber-400/60"
              >
                Manager console
              </Link>
            ) : null}
            <RequestSchoolWorkspaceCta variant="compact" className="mt-3" />
            <button
              type="button"
              onClick={() => void logout()}
              className="mx-2 mt-4 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-white/5 hover:text-rose-200"
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

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileChrome
          title={shellTitle}
          subtitle={shellSubtitle}
          accent="cyan"
          panelId="tuition-admin-mobile-menu"
          backHref={
            showSchoolErp
              ? pathname === "/admin/school-dashboard" || pathname === "/school-admin/school-dashboard"
                ? "/"
                : hrefWithOrgSlug(`${base}/school-dashboard`)
              : pathname === "/admin" || pathname === "/admin/" || pathname === "/school-admin"
                ? "/"
                : "/admin"
          }
          backLabel={
            showSchoolErp
              ? pathname.includes("school-dashboard")
                ? "Lobby"
                : "School dashboard"
              : pathname === "/admin" || pathname === "/admin/" || pathname === "/school-admin"
                ? "Lobby"
                : "Admin home"
          }
          items={mobileItems}
          secondarySections={[
            {
              id: "guides",
              label: "Guides",
              items: guideLinks.map((g) => ({ href: g.helpHref, label: g.dashboardLabel })),
            },
            {
              id: "help",
              label: "Support",
              items: [{ href: "/help", label: "Help center" }],
            },
          ]}
          afterSections={<DashboardChatNavButton variant="tuition" />}
          trailing={
            <div className="flex items-center gap-2">
              <DashboardNotificationBell hub="admin" />
              {isMaster ? (
                <Link href="/admin/master" className="text-[11px] font-medium text-amber-400/90">
                  Manager
                </Link>
              ) : null}
            </div>
          }
          footer={
            <div className="space-y-2">
              {isMaster ? (
                <Link
                  href="/admin/master"
                  className="block rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-center text-xs font-medium text-amber-100"
                >
                  Manager console
                </Link>
              ) : null}
              <RequestSchoolWorkspaceCta variant="compact" />
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-200/90 hover:bg-white/5"
              >
                Logout
              </button>
            </div>
          }
        />
        <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden px-4 py-6 md:py-8">
          <AdminWorkspaceBar />
          {authMe?.dbDegraded ? <DbDegradedBanner /> : null}
          <WorkspaceEmailUnverifiedBanner />
          {showSchoolErp ? <SchoolContextBar /> : null}
          {isMaster && !orgSlug && pathname.includes("/school-") ? (
            <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-100">
              Select a school workspace using <strong>?orgSlug=</strong> in the URL or the workspace filter to load
              school ERP data.
            </p>
          ) : null}
          {children}
          {showSchoolErp ? (
            <div className="mt-8 max-w-sm">
              <AdSlot placement="web_schools_dashboard" hub="schools" />
            </div>
          ) : (
            <div className="mt-8 max-w-sm">
              <AdSlot placement="web_dashboard_sidebar" hub="tuition" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TuitionAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-[#070d18]" />}>
      <TuitionAdminShellInner>{children}</TuitionAdminShellInner>
    </Suspense>
  );
}
