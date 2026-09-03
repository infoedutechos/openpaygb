"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";
import { AdminWorkspaceBar } from "@/components/admin/AdminWorkspaceBar";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { invalidateAuthMeCache, useAuthMe } from "@/hooks/useAuthMe";
import { DbDegradedBanner } from "@/components/admin/DbDegradedBanner";
import { WorkspaceEmailUnverifiedBanner } from "@/components/admin/WorkspaceEmailUnverifiedBanner";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { DashboardGuideNavLinks } from "@/components/nav/DashboardGuideNavLinks";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { WelcomeBackStrip } from "@/components/profile/WelcomeBackStrip";
import { adminRoleToProfileRole } from "@/lib/profile-mappers";
import { DEX_SIDEBAR_NAV, pathnameIsDexHub } from "@/lib/dex-nav";
import { SchoolContextBar } from "@/components/admin/school/SchoolContextBar";
import { adminGuideForTier, AUDIENCE_GUIDES } from "@/lib/audience-guides";

const UNIVERSITY_SEGMENTS: { suffix: string; label: string; schoolOnly?: boolean }[] = [
  { suffix: "", label: "Dashboard" },
  { suffix: "/profile", label: "Profile" },
  { suffix: "/my-card", label: "My OpenPayGB Card" },
  { suffix: "/tuition-balance", label: "Tuition balance" },
  { suffix: "/students", label: "Students" },
  { suffix: "/school-structure", label: "Classes & streams", schoolOnly: true },
  { suffix: "/payments", label: "Payments" },
  { suffix: "/payment-requests", label: "Payment requests" },
  { suffix: "/virtual-cards", label: "OpenPayGB Cards" },
  { suffix: "/school-staff", label: "Staff" },
  { suffix: "/programmes", label: "Programs" },
  { suffix: "/receipts", label: "Receipts" },
  { suffix: "/reports", label: "Reports" },
  { suffix: "/users", label: "Users" },
  { suffix: "/settings", label: "Settings" },
];

const SCHOOL_ERP_SEGMENTS: { suffix: string; label: string }[] = [
  { suffix: "/school-dashboard", label: "Dashboard" },
  { suffix: "/profile", label: "Profile" },
  { suffix: "/my-card", label: "My OpenPayGB Card" },
  { suffix: "/school-session", label: "Session" },
  { suffix: "/school-accounts", label: "Accounts" },
  { suffix: "/school-structure", label: "Class registration" },
  { suffix: "/programmes", label: "Fee programmes" },
  { suffix: "/students", label: "Students / bills" },
  { suffix: "/fee-ledger", label: "Fee ledger" },
  { suffix: "/fee-structure", label: "Fee structure" },
  { suffix: "/school-golive", label: "Go-live" },
  { suffix: "/defaulters", label: "Defaulters" },
  { suffix: "/school-cashbook", label: "Cashbook" },
  { suffix: "/school-attendance", label: "Attendance" },
  { suffix: "/school-quran", label: "Qur'an progress" },
  { suffix: "/school-exams", label: "Examinations" },
  { suffix: "/school-audit", label: "Audit log" },
  { suffix: "/receipts", label: "Receipt of payments" },
  { suffix: "/payment-requests", label: "Payment requests" },
  { suffix: "/virtual-cards", label: "OpenPayGB Cards" },
  { suffix: "/school-staff", label: "Staff" },
  { suffix: "/school-outflow", label: "Outflow" },
  { suffix: "/school-inventory", label: "Inventory" },
  { suffix: "/school-reports", label: "Reports" },
  { suffix: "/payments", label: "Online payments" },
  { suffix: "/users", label: "Users" },
  { suffix: "/settings", label: "Settings" },
];

function navActive(pathname: string, href: string): boolean {
  if (href === DEX_SIDEBAR_NAV.href) return pathnameIsDexHub(pathname);
  if (href.endsWith("/admin") || href.endsWith("/school-admin")) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
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
    const segments = showSchoolErp
      ? SCHOOL_ERP_SEGMENTS
      : UNIVERSITY_SEGMENTS.filter((s) => !s.schoolOnly);
    return [
      ...segments.map((s) => ({
        href: hrefWithOrgSlug(`${base}${s.suffix}`),
        label: s.label,
      })),
      ...(showSchoolErp ? [] : [DEX_SIDEBAR_NAV]),
    ];
  }, [base, hrefWithOrgSlug, showSchoolErp]);
  const tenantLabel = !authMe?.admin
    ? authMe?.adminShellAccess
      ? "Tuition sign-in pending"
      : "Admin"
    : schoolName ?? (authMe.admin.role === "master" ? "Platform overview" : "Admin");
  const shellTitle = isSchoolAdmin ? schoolName! : "ODEL HUB";
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-[#0a101f] py-6 pl-4 pr-2 text-slate-200 md:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-100">
            <OdelShieldIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide text-white">ODEL HUB</p>
            <p className="truncate text-xs text-slate-400" title={tenantLabel}>
              {tenantLabel}
            </p>
          </div>
        </div>
        {adminWelcomeName && adminWelcomeRole ? (
          <div className="mb-4 px-2">
            <WelcomeBackStrip
              name={adminWelcomeName}
              role={adminWelcomeRole}
              previousLoginAt={authMe?.admin?.previousLoginAt}
            />
          </div>
        ) : null}
        <nav className="flex flex-1 flex-col gap-0.5 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 transition-colors ${
                navActive(pathname, item.href)
                  ? "bg-cyan-500/15 font-medium text-cyan-100"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <DashboardChatNavButton variant="tuition" />
          <DashboardGuideNavLinks guides={guideLinks} />
        </nav>
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
            isMaster ? (
              <Link href="/admin/master" className="text-[11px] font-medium text-amber-400/90">
                Manager
              </Link>
            ) : null
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
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">
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
