"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTmaBootstrap } from "@/hooks/useTmaBootstrap";
import type { TmaMePayload } from "@/lib/tma-types";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";
import { TmaPayFlow } from "@/components/tma/TmaPayFlow";
import { TmaReceipts } from "@/components/tma/TmaReceipts";
import { TmaCardTopup } from "@/components/tma/TmaCardTopup";

const STUDENT_TABS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "card", label: "Card", icon: "💳" },
  { id: "pay", label: "Pay", icon: "💰" },
  { id: "history", label: "History", icon: "🧾" },
  { id: "profile", label: "Profile", icon: "👤" },
] as const;

const ADMIN_TABS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "students", label: "Students", icon: "🎓" },
  { id: "payments", label: "Payments", icon: "💰" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙" },
] as const;

/** Web admin routes with mobile card layouts — safe to open from TMA deep-links. */
const SCHOOL_ADMIN_SAFE_ROUTES: Record<string, { href: string; label: string; hint: string }> = {
  students: { href: "/admin/students", label: "Students", hint: "Mobile student cards" },
  payments: { href: "/admin/payments", label: "Payments", hint: "Mobile payment list" },
  reports: { href: "/admin/reports", label: "Reports", hint: "Responsive charts" },
  settings: { href: "/admin/profile", label: "Profile & settings", hint: "Account and password" },
};

const MASTER_ADMIN_SAFE_ROUTES: Record<string, { href: string; label: string; hint: string }> = {
  students: {
    href: "/admin/master/organizations",
    label: "Organizations",
    hint: "School approval — mobile cards",
  },
  payments: { href: "/admin/payments", label: "Payments", hint: "Mobile payment list" },
  reports: { href: "/admin/reports", label: "Reports", hint: "Responsive charts" },
  settings: { href: "/admin/master", label: "Manager console", hint: "Master overview" },
};

function TmaAdminTabLink({
  tab,
  routes,
}: {
  tab: string;
  routes: Record<string, { href: string; label: string; hint: string }>;
}) {
  const route = routes[tab];
  if (!route) {
    return (
      <div className="p-4">
        <Link href="/admin" className="tma-btn">
          Open admin console
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">{route.label}</h2>
      <p className="text-sm opacity-70">{route.hint}</p>
      <Link href={route.href} className="tma-btn">
        Open {route.label}
      </Link>
    </div>
  );
}

function fmtUgx(n: number) {
  return `UGX ${n.toLocaleString()}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StudentHome({
  data,
  onPay,
}: {
  data: TmaMePayload;
  onPay: () => void;
}) {
  const s = data.student;
  const b = data.balance;
  return (
    <div>
      <header className="tma-header">
        <p className="text-xs uppercase tracking-wider opacity-70">ODEL HUB Pay</p>
        <h1 className="text-lg font-semibold">
          {greeting()} {s?.name.split(" ")[0] ?? data.telegram.firstName}
        </h1>
        {s ? (
          <p className="mt-1 text-sm opacity-70">
            Student ID: {s.accountLabel}
          </p>
        ) : null}
      </header>

      <section className="tma-card">
        <p className="text-sm opacity-70">Outstanding balance</p>
        <p className="tma-balance mt-1">{fmtUgx(b?.outstandingUgx ?? 0)}</p>
        {s ? (
          <Link href={`/pay/${encodeURIComponent(s.organizationSlug)}`} className="tma-btn mt-4">
            Pay now
          </Link>
        ) : (
          <p className="mt-3 text-sm opacity-70">Link your student record via the bot or web portal.</p>
        )}
      </section>

      <section className="tma-card">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Quick actions</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            { label: `${OPEN_PAY_BRAND} Card`, tab: "card" },
            { label: "Tuition balance", tab: "home" },
            { label: "Receipts", tab: "history" },
            { label: "Make payment", tab: "pay", action: onPay },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="tma-btn-secondary rounded-lg px-3 py-3 text-left"
              onClick={() => {
                if ("action" in item && item.action) {
                  item.action();
                  return;
                }
                const el = document.querySelector(`[data-tma-tab="${item.tab}"]`) as HTMLButtonElement | null;
                el?.click();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function StudentDashboard({ data }: { data: TmaMePayload }) {
  const s = data.student;
  const b = data.balance;
  if (!s) return <GuestPanel data={data} />;
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">Student dashboard</h2>
      <div className="tma-card !m-0">
        <p className="font-medium">{s.organizationName}</p>
        <p className="text-sm opacity-80">{s.programmeCode}</p>
        <p className="text-sm opacity-70">
          Year {s.year} · Semester {s.semester}
        </p>
        <p className="mt-4 text-xs uppercase tracking-wider opacity-60">Progress</p>
        <div className="tma-progress mt-2">
          <span style={{ width: `${b?.progressPct ?? 0}%` }} />
        </div>
        <p className="mt-1 text-sm opacity-70">{b?.progressPct ?? 0}% paid</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="opacity-60">Fees paid</p>
            <p className="font-semibold">{fmtUgx(b?.paidUgx ?? 0)}</p>
          </div>
          <div>
            <p className="opacity-60">Balance</p>
            <p className="font-semibold">{fmtUgx(b?.outstandingUgx ?? 0)}</p>
          </div>
        </div>
      </div>
      {b?.nextInstallment ? (
        <div className="tma-card !m-0">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Next installment</p>
          <p className="mt-2 text-sm">{b.nextInstallment.dueLabel}</p>
          <p className="text-lg font-semibold">{fmtUgx(b.nextInstallment.amountUgx)}</p>
          <Link href={`/pay/${encodeURIComponent(s.organizationSlug)}`} className="tma-btn mt-3">
            Pay installment
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function CardScreen({ data, onRefresh }: { data: TmaMePayload; onRefresh?: () => void }) {
  const c = data.card;
  const s = data.student;
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">{OPEN_PAY_BRAND} Card</h2>
      {c ? (
        <>
          <div className="tma-virtual-card">
            <p className="text-xs tracking-[0.2em] opacity-80">{OPEN_PAY_BRAND.toUpperCase()}</p>
            <p className="mt-6 font-mono text-lg tracking-widest">{c.maskedPan}</p>
            <p className="mt-4 text-sm font-semibold">{c.holderName}</p>
            <p className="text-xs opacity-80">EXP {c.expiryLabel}</p>
          </div>
          <div className="tma-card !m-0">
            <p className="text-sm opacity-70">Balance</p>
            <p className="text-2xl font-bold">{fmtUgx(c.balanceUgx)}</p>
            <TmaCardTopup onDone={onRefresh} />
            <div className="mt-3 grid gap-2">
              {s ? (
                <button
                  type="button"
                  className="tma-btn-secondary tma-btn"
                  onClick={() => {
                    const el = document.querySelector('[data-tma-tab="pay"]') as HTMLButtonElement | null;
                    el?.click();
                  }}
                >
                  Pay tuition
                </button>
              ) : null}
              <button
                type="button"
                className="tma-btn-secondary tma-btn"
                onClick={() => {
                  const el = document.querySelector('[data-tma-tab="history"]') as HTMLButtonElement | null;
                  el?.click();
                }}
              >
                Transaction history
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="tma-card !m-0">
          <p className="text-sm opacity-80">No active virtual card yet.</p>
          <Link href="/student/card" className="tma-btn mt-4">
            Get OpenPayGB card
          </Link>
        </div>
      )}
    </div>
  );
}

function PayScreen({ data }: { data: TmaMePayload }) {
  if (!data.student) return <GuestPanel data={data} />;
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">Tuition payment</h2>
      <TmaPayFlow data={data} />
    </div>
  );
}

function HistoryScreen({ data }: { data: TmaMePayload }) {
  if (!data.student) return <GuestPanel data={data} />;
  return <TmaReceipts />;
}

function ProfileScreen({ data }: { data: TmaMePayload }) {
  const s = data.student;
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">Profile</h2>
      <div className="tma-card !m-0 text-sm space-y-2">
        <p className="font-medium">{data.welcome.headline}</p>
        <p className="opacity-70">{data.welcome.subline}</p>
        {s ? (
          <>
            <p>
              <span className="opacity-60">School:</span> {s.organizationName}
            </p>
            <p>
              <span className="opacity-60">Programme:</span> {s.programmeCode}
            </p>
            <p>
              <span className="opacity-60">Email:</span> {s.email}
            </p>
          </>
        ) : null}
        <Link href="/my/profile" className="tma-btn mt-3">
          Full profile on web
        </Link>
      </div>
    </div>
  );
}

function SchoolsBrowseScreen() {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">Browse schools</h2>
      <p className="text-sm opacity-70">
        Pay tuition as a guest, or open the product lobbies for higher institutions and K–12 schools.
      </p>
      <Link href="/pay" className="tma-btn">
        Choose school / checkout
      </Link>
      <Link href="/OdelPaySchools" className="tma-btn-secondary tma-btn">
        OdelPay Schools
      </Link>
      <Link href="/OdelPayUniversities" className="tma-btn-secondary tma-btn">
        OdelPay Universities
      </Link>
      <Link href="/student/login" className="tma-btn-secondary tma-btn">
        Student sign-in
      </Link>
    </div>
  );
}

function GuestPanel({ data }: { data: TmaMePayload }) {
  return (
    <div className="tma-card text-center">
      <p className="font-medium">Welcome, {data.telegram.firstName}</p>
      <p className="mt-2 text-sm opacity-70">
        No linked student record yet. Pay as a guest or register for the student portal.
      </p>
      <Link href="/pay" className="tma-btn mt-4">
        Browse schools
      </Link>
      <Link href="/student/register" className="tma-btn-secondary tma-btn mt-2">
        Register
      </Link>
    </div>
  );
}

function SchoolAdminApp({ data, tab, setTab }: { data: TmaMePayload; tab: string; setTab: (t: string) => void }) {
  const summary = data.adminSummary;
  return (
    <div>
      {tab === "dashboard" ? (
        <div className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">School admin dashboard</h2>
          <p className="text-sm opacity-70">{data.admin?.organizationName}</p>
          <div className="tma-card !m-0 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="opacity-60">Students</p>
              <p className="text-xl font-bold">{summary?.students?.toLocaleString() ?? "—"}</p>
            </div>
            <div>
              <p className="opacity-60">Collected fees</p>
              <p className="text-xl font-bold">{summary ? fmtUgx(summary.collectedUgx) : "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Students", href: SCHOOL_ADMIN_SAFE_ROUTES.students.href },
              { label: "Payments", href: SCHOOL_ADMIN_SAFE_ROUTES.payments.href },
              { label: "Reports", href: SCHOOL_ADMIN_SAFE_ROUTES.reports.href },
              { label: "Programmes", href: "/admin/programmes" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="tma-btn-secondary tma-btn text-sm">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <TmaAdminTabLink tab={tab} routes={SCHOOL_ADMIN_SAFE_ROUTES} />
      )}
      <nav className="tma-nav">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-tma-tab={t.id}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function MasterAdminApp({ data, tab, setTab }: { data: TmaMePayload; tab: string; setTab: (t: string) => void }) {
  const m = data.master;
  const dashboard = tab === "dashboard" || tab === "home";
  return (
    <div>
      {dashboard ? (
        <div className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">ODEL HUB Master Console</h2>
          <div className="tma-card !m-0 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="opacity-60">Active schools</p>
              <p className="text-xl font-bold">{m?.activeSchools?.toLocaleString() ?? "—"}</p>
            </div>
            <div>
              <p className="opacity-60">Students</p>
              <p className="text-xl font-bold">{m?.totalStudents?.toLocaleString() ?? "—"}</p>
            </div>
            <div>
              <p className="opacity-60">Payments</p>
              <p className="text-xl font-bold">{m?.totalPayments?.toLocaleString() ?? "—"}</p>
            </div>
            <div>
              <p className="opacity-60">Active cards</p>
              <p className="text-xl font-bold">{m?.activeCards?.toLocaleString() ?? "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Organizations", href: MASTER_ADMIN_SAFE_ROUTES.students.href },
              { label: "Payments", href: MASTER_ADMIN_SAFE_ROUTES.payments.href },
              { label: "Cards", href: "/admin/master#openpay-cards-overview" },
              { label: "Reports", href: MASTER_ADMIN_SAFE_ROUTES.reports.href },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="tma-btn-secondary tma-btn text-sm">
                {item.label}
              </Link>
            ))}
          </div>
          <Link href="/admin/master" className="tma-btn">
            Open manager console
          </Link>
        </div>
      ) : (
        <TmaAdminTabLink tab={tab} routes={MASTER_ADMIN_SAFE_ROUTES} />
      )}
      <nav className="tma-nav">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function StudentApp({
  data,
  tab,
  setTab,
  onRefresh,
}: {
  data: TmaMePayload;
  tab: string;
  setTab: (t: string) => void;
  onRefresh: () => void;
}) {
  let body: React.ReactNode;
  if (tab === "home") body = <StudentHome data={data} onPay={() => setTab("pay")} />;
  else if (tab === "schools") body = <SchoolsBrowseScreen />;
  else if (tab === "card") body = <CardScreen data={data} onRefresh={onRefresh} />;
  else if (tab === "pay") body = <PayScreen data={data} />;
  else if (tab === "history") body = <HistoryScreen data={data} />;
  else if (tab === "profile") body = <ProfileScreen data={data} />;
  else if (tab === "dashboard" || tab === "balance") body = <StudentDashboard data={data} />;
  else body = <StudentHome data={data} onPay={() => setTab("pay")} />;

  return (
    <div>
      {body}
      <nav className="tma-nav">
        {STUDENT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-tma-tab={t.id}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function TmaApp() {
  const params = useSearchParams();
  const startTab = params.get("start") ?? params.get("tab") ?? "home";
  const { data, tab, setTab, loading, error, refresh } = useTmaBootstrap(startTab);

  if (loading) {
    return (
      <div className="tma-root flex min-h-dvh items-center justify-center p-6 text-sm opacity-70">
        Loading ODEL HUB Pay…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tma-root flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-medium">Could not open Mini App</p>
        <p className="text-sm opacity-70">{error ?? "Unknown error"}</p>
        <Link href="/student/login" className="tma-btn max-w-xs">
          Sign in on web
        </Link>
      </div>
    );
  }

  if (data.role === "master") {
    return (
      <div className="tma-root">
        <MasterAdminApp data={data} tab={tab} setTab={setTab} />
      </div>
    );
  }

  if (data.role === "org_admin") {
    return (
      <div className="tma-root">
        <SchoolAdminApp data={data} tab={tab} setTab={setTab} />
      </div>
    );
  }

  return (
    <div className="tma-root">
      <StudentApp data={data} tab={tab} setTab={setTab} onRefresh={refresh} />
    </div>
  );
}
