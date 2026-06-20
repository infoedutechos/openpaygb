"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MasterInstitutionProductCards } from "@/components/admin/MasterInstitutionProductCards";
import { MasterPendingSchoolsBanner } from "@/components/admin/MasterPendingSchoolsBanner";
import { MasterFxSettings } from "@/components/admin/MasterFxSettings";
import { MasterBackupPanel } from "@/components/admin/MasterBackupPanel";
import { MasterProjectDownloadPanel } from "@/components/admin/MasterProjectDownloadPanel";
import { MasterPlatformSocialSettings } from "@/components/admin/MasterPlatformSocialSettings";
import { MasterPartnerIntegrations } from "@/components/admin/MasterPartnerIntegrations";
import { MasterMobileMoneyProviders } from "@/components/admin/MasterMobileMoneyProviders";
import { MasterSchoolWorkspaceRegistrationSettings } from "@/components/admin/MasterSchoolWorkspaceRegistrationSettings";
import { MasterPlatformCheckoutFeeSettings } from "@/components/admin/MasterPlatformCheckoutFeeSettings";
import { MasterOpenPayCardSettings } from "@/components/admin/MasterOpenPayCardSettings";
import { MasterOpenPayCardsOverview } from "@/components/admin/MasterOpenPayCardsOverview";
import { MasterDeploymentEnvSettings } from "@/components/admin/MasterDeploymentEnvSettings";
import { MasterKnowledgeBaseSettings } from "@/components/admin/MasterKnowledgeBaseSettings";
import { MasterPlatformCommunicationsSettings } from "@/components/admin/MasterPlatformCommunicationsSettings";
import { MasterHubMaintenanceSettings } from "@/components/admin/MasterHubMaintenanceSettings";
import { MasterTelegramHubSettings } from "@/components/admin/MasterTelegramHubSettings";
import { MasterPaymentProviders } from "@/components/admin/MasterPaymentProviders";
import { readJsonResponse } from "@/utils/read-json-response";
import { AdminUserProfileSection } from "@/components/profile/AdminUserProfileSection";

type MasterSummary = {
  organizations: { active: number; pending: number; rejected: number; total: number };
  organizationsByTier?: {
    schools: { active: number; pending: number; total: number };
    higher: { active: number; pending: number; total: number };
  };
  tuition: { totalStudents: number; totalPayments: number; totalCollectionsTon: number };
  platformAdmins: { orgAdmins: number };
  openPayCards?: { active: number; totalBalanceUgx: number };
};

type UnsetProgrammeCount = { count: number };

export default function MasterManagerOverviewPage() {
  const [data, setData] = useState<MasterSummary | null>(null);
  const [unsetProgrammes, setUnsetProgrammes] = useState<UnsetProgrammeCount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/master/summary", { credentials: "include" });
      const parsed = await readJsonResponse<MasterSummary>(r);
      if (!parsed.ok) {
        if (!cancelled) setError(parsed.error);
        return;
      }
      if (!cancelled) setData(parsed.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/master/programmes?onlyUnset=1", { credentials: "include" });
      if (!r.ok) return;
      const j = (await r.json()) as { programmes?: unknown[] };
      if (!cancelled) {
        setUnsetProgrammes({ count: Array.isArray(j.programmes) ? j.programmes.length : 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading manager overview…</p>;
  }

  return (
    <div className="space-y-10 text-slate-200">
      <AdminUserProfileSection includePassword />
      <MasterPendingSchoolsBanner />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400/90">Manager dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Master Admin Console</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Platform-wide view across all organizations. Approve tenants, create org admins, and open the tuition hub when
          you need school-level collections data. Tuition checkout exposes TON Connect and OpenPayGB (Mbiyo / LivePay) to guests and
          students;
          keep <span className="font-mono text-slate-500">NEXT_PUBLIC_APP_URL</span> correct so{" "}
          <span className="font-mono text-slate-500">/api/webhooks/mbiyo</span> and other callbacks resolve on the public
          internet.
        </p>
      </div>

      {data.organizationsByTier ? (
        <MasterInstitutionProductCards
          higher={data.organizationsByTier.higher}
          schools={data.organizationsByTier.schools}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Organizations (active)" value={String(data.organizations.active)} hint="Approved tenants" />
        <MetricCard label="Pending approval" value={String(data.organizations.pending)} hint="Awaiting master action" accent="amber" />
        <MetricCard label="Students (all orgs)" value={String(data.tuition.totalStudents)} hint="Registered payers" />
        <MetricCard label="Payments (all orgs)" value={String(data.tuition.totalPayments)} hint="All rails" />
      </div>

      {data.openPayCards ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/master#openpay-cards-overview"
            className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 hover:border-violet-400/45 transition-colors"
          >
            <p className="text-xs uppercase tracking-wide text-violet-300/80">Virtual cards (active)</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{data.openPayCards.active}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              UGX {data.openPayCards.totalBalanceUgx.toLocaleString()} total balance · View registry ↓
            </p>
          </Link>
        </div>
      ) : null}

      {unsetProgrammes && unsetProgrammes.count > 0 ? (
        <section className="rounded-xl border border-amber-500/35 bg-amber-950/30 p-5">
          <h2 className="text-sm font-semibold text-amber-100">Programme duration setup pending</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            <strong className="font-medium text-amber-200">{unsetProgrammes.count}</strong> programme
            {unsetProgrammes.count === 1 ? " has" : "s have"} no explicit{" "}
            <span className="text-slate-200">Years</span> or{" "}
            <span className="text-slate-200">Semesters / year</span>. Until set, completion progress on student
            payment records falls back to inferring duration from fee rows, which may be incomplete for new tenants.
          </p>
          <Link
            href="/admin/master/programmes"
            className="mt-3 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-500"
          >
            Configure programme durations
          </Link>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold text-white">Confirmed collections</h2>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-amber-100">
            {data.tuition.totalCollectionsTon.toLocaleString()} <span className="text-lg font-normal text-slate-500">TON</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">Sum of confirmed tuition payments platform-wide.</p>
        </section>
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold text-white">Administrators</h2>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-white">{data.platformAdmins.orgAdmins}</p>
          <p className="mt-2 text-xs text-slate-500">Org-scoped admin accounts (excluding master).</p>
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/master/organizations"
          className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-900/30 hover:bg-amber-500"
        >
          Manage organizations
        </Link>
        <Link
          href="/admin/master/tuition-balance"
          className="rounded-xl border border-cyan-500/35 bg-cyan-950/25 px-5 py-2.5 text-sm font-medium text-cyan-100 hover:border-cyan-400/55"
        >
          Tuition balance
        </Link>
        <Link
          href="/admin/master/programmes"
          className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-5 py-2.5 text-sm font-medium text-amber-100 hover:border-amber-400/55"
        >
          Programme durations
        </Link>
        <Link
          href="/admin/master/organizations#checkout-platform-fees"
          className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-5 py-2.5 text-sm font-medium text-amber-100 hover:border-amber-400/55"
        >
          Per-school processing fees
        </Link>
        <Link
          href="/admin/master#ton-ugx-rate"
          className="rounded-xl border border-cyan-500/35 bg-cyan-950/25 px-5 py-2.5 text-sm font-medium text-cyan-100 hover:border-cyan-400/55"
        >
          TON / UGX rate
        </Link>
        <Link
          href="/admin/master#deployment-environment"
          className="rounded-xl border border-indigo-500/35 bg-indigo-950/25 px-5 py-2.5 text-sm font-medium text-indigo-100 hover:border-indigo-400/55"
        >
          Environment
        </Link>
        <Link
          href="/admin/master#project-download"
          className="rounded-xl border border-cyan-500/35 bg-cyan-950/25 px-5 py-2.5 text-sm font-medium text-cyan-100 hover:border-cyan-400/55"
        >
          Project download
        </Link>
        <Link
          href="/admin/master#project-download"
          className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-5 py-2.5 text-sm font-medium text-emerald-100 hover:border-emerald-400/55"
        >
          Download docs & guides
        </Link>
        <Link
          href="/admin/master#platform-communications"
          className="rounded-xl border border-sky-500/35 bg-sky-950/25 px-5 py-2.5 text-sm font-medium text-sky-100 hover:border-sky-400/55"
        >
          Chat & notifications
        </Link>
        <Link
          href="/admin/master#knowledge-base"
          className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-5 py-2.5 text-sm font-medium text-emerald-100 hover:border-emerald-400/55"
        >
          Knowledge base
        </Link>
        <Link
          href="/admin/master#openpay-cards-overview"
          className="rounded-xl border border-violet-500/35 bg-violet-950/25 px-5 py-2.5 text-sm font-medium text-violet-100 hover:border-violet-400/55"
        >
          Virtual cards
        </Link>
        <Link
          href="/admin/master#mobile-money-providers"
          className="rounded-xl border border-teal-500/35 bg-teal-950/25 px-5 py-2.5 text-sm font-medium text-teal-100 hover:border-teal-400/55"
        >
          Mobile money
        </Link>
        <Link
          href="/admin/master#partner-integrations"
          className="rounded-xl border border-violet-500/35 bg-violet-950/25 px-5 py-2.5 text-sm font-medium text-violet-100 hover:border-violet-400/55"
        >
          Partner API
        </Link>
        <Link
          href="/admin/master#platform-social"
          className="rounded-xl border border-cyan-500/35 bg-cyan-950/25 px-5 py-2.5 text-sm font-medium text-cyan-100 hover:border-cyan-400/55"
        >
          Social & share
        </Link>
        <Link
          href="/admin/master#school-workspace-registration"
          className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-5 py-2.5 text-sm font-medium text-amber-100 hover:border-amber-400/55"
        >
          School registration
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-5 py-2.5 text-sm font-medium text-cyan-100 hover:border-cyan-400/50"
        >
          Open tuition hub
        </Link>
      </div>

      <MasterDeploymentEnvSettings />

      <MasterHubMaintenanceSettings />

      <MasterKnowledgeBaseSettings />

      <MasterPlatformCommunicationsSettings />

      <MasterPlatformCheckoutFeeSettings />

      <MasterOpenPayCardSettings />

      <MasterOpenPayCardsOverview />

      <MasterSchoolWorkspaceRegistrationSettings />

      <MasterFxSettings />

      <MasterPaymentProviders />

      <MasterMobileMoneyProviders />

      <MasterPartnerIntegrations />

      <MasterTelegramHubSettings />

      <MasterPlatformSocialSettings />

      <MasterProjectDownloadPanel />

      <MasterBackupPanel />

      <p className="text-xs text-slate-600">
        Rejected organizations: {data.organizations.rejected} · Total org records: {data.organizations.total}
      </p>

    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "amber";
}) {
  return (
    <div
      className={`rounded-xl border bg-[var(--card)] p-4 ${
        accent === "amber" ? "border-amber-500/25 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]" : "border-[var(--border)]"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-600">{hint}</p>
    </div>
  );
}
