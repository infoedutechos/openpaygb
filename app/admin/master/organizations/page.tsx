"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import { MasterOrgMobileCard } from "@/components/admin/MasterOrgMobileCard";
import { MasterOrgTableRow } from "@/components/admin/master-org/MasterOrgTableRow";
import type { MasterOrgRow } from "@/components/admin/master-org/types";
import {
  registrationSegmentSubtitle,
  registrationSegmentTitle,
  type RegistrationSegment,
} from "@/lib/institution-tier";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  institutionTier?: string;
  tenantStatus: string;
  registrationContactEmail: string;
  registrationNote: string;
  registrationEmailVerifiedAt: string | null;
  destinationWallet: string;
  checkoutPlatformFeeUgx: number;
  fxOverrideKind: string;
  fxOverrideUgxPerTon: number | null;
  fxOverrideBufferPct: number;
  createdAt: string;
  hasFavicon?: boolean;
  faviconUploadedAt?: string | null;
  _count: { programmes: number; students: number; payments: number };
};

export default function MasterOrganizationsPage() {
  const searchParams = useSearchParams();
  const tierFilter = searchParams.get("tier")?.trim().toLowerCase() ?? "";
  const tierSegment: RegistrationSegment | null =
    tierFilter === "school" ? "schools" : tierFilter === "university" ? "higher" : null;

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [faviconBusyId, setFaviconBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminOrgId, setAdminOrgId] = useState("");
  const [adminSendInviteEmail, setAdminSendInviteEmail] = useState(true);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  const [feeBusyId, setFeeBusyId] = useState<string | null>(null);
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [walletBusyId, setWalletBusyId] = useState<string | null>(null);
  const [walletDrafts, setWalletDrafts] = useState<Record<string, string>>({});
  const [fxBusyId, setFxBusyId] = useState<string | null>(null);
  const [fxKindDrafts, setFxKindDrafts] = useState<Record<string, string>>({});
  const [fxUgxDrafts, setFxUgxDrafts] = useState<Record<string, string>>({});
  const [fxBufferDrafts, setFxBufferDrafts] = useState<Record<string, string>>({});

  const visibleOrgs = useMemo(() => {
    if (!tierFilter) return orgs;
    if (tierFilter === "school") return orgs.filter((o) => o.institutionTier === "school");
    if (tierFilter === "university") return orgs.filter((o) => o.institutionTier === "university");
    return orgs;
  }, [orgs, tierFilter]);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/master/organizations", { credentials: "include" });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "Could not load organizations");
      setOrgs([]);
      return;
    }
    setOrgs(j.organizations ?? []);
  }, []);

  useEffect(() => {
    setFeeDrafts((prev) => {
      const next = { ...prev };
      for (const o of orgs) {
        if (next[o.id] === undefined) next[o.id] = String(o.checkoutPlatformFeeUgx ?? -1);
      }
      return next;
    });
    setWalletDrafts((prev) => {
      const next = { ...prev };
      for (const o of orgs) {
        if (next[o.id] === undefined) next[o.id] = o.destinationWallet ?? "";
      }
      return next;
    });
    setFxKindDrafts((prev) => {
      const next = { ...prev };
      for (const o of orgs) {
        if (next[o.id] === undefined) next[o.id] = o.fxOverrideKind ?? "inherit";
      }
      return next;
    });
    setFxUgxDrafts((prev) => {
      const next = { ...prev };
      for (const o of orgs) {
        if (next[o.id] === undefined) {
          next[o.id] =
            o.fxOverrideUgxPerTon != null && o.fxOverrideUgxPerTon > 0 ? String(o.fxOverrideUgxPerTon) : "";
        }
      }
      return next;
    });
    setFxBufferDrafts((prev) => {
      const next = { ...prev };
      for (const o of orgs) {
        if (next[o.id] === undefined) next[o.id] = String(o.fxOverrideBufferPct ?? 0);
      }
      return next;
    });
  }, [orgs]);

  const uploadFavicon = useCallback(async (org: OrgRow, file: File) => {
    setError(null);
    setFaviconBusyId(org.id);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(`/api/master/organizations/${encodeURIComponent(org.id)}/favicon`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Upload failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setFaviconBusyId(null);
    }
  }, [load]);

  const removeFavicon = useCallback(
    async (org: OrgRow) => {
      if (!confirm(`Remove favicon for “${org.name}”?`)) return;
      setError(null);
      setFaviconBusyId(org.id);
      try {
        const r = await fetch(`/api/master/organizations/${encodeURIComponent(org.id)}/favicon`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "Could not remove favicon");
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not remove favicon");
      } finally {
        setFaviconBusyId(null);
      }
    },
    [load]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function patchOrg(id: string, action: "approve" | "reject" | "reopen") {
    setBusyId(id);
    setError(null);
    try {
      const r = await fetch(`/api/master/organizations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function resendVerification(org: OrgRow) {
    setBusyId(org.id);
    setError(null);
    setCreateMsg(null);
    try {
      const r = await fetch(
        `/api/master/organizations/${encodeURIComponent(org.id)}/resend-verification`,
        { method: "POST", credentials: "include" },
      );
      const j = (await r.json()) as { error?: string; message?: string; devConfirmUrl?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not resend verification email");
      setCreateMsg(
        j.devConfirmUrl
          ? `${j.message ?? "Sent."} Dev link: ${j.devConfirmUrl}`
          : (j.message ?? "Verification email sent."),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend verification email");
    } finally {
      setBusyId(null);
    }
  }

  async function saveDestinationWallet(orgId: string) {
    setWalletBusyId(orgId);
    setError(null);
    try {
      const destinationWallet = (walletDrafts[orgId] ?? "").trim();
      const r = await fetch(
        `/api/master/organizations/${encodeURIComponent(orgId)}/destination-wallet`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ destinationWallet }),
        },
      );
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setWalletBusyId(null);
    }
  }

  async function savePlatformFee(orgId: string) {
    setFeeBusyId(orgId);
    setError(null);
    try {
      const raw = feeDrafts[orgId]?.trim() ?? "-1";
      const n = parseInt(raw, 10);
      if (Number.isNaN(n) || n < -1) {
        throw new Error("Enter -1 to inherit env default, or 0+ for fixed UGX.");
      }
      const r = await fetch(`/api/master/organizations/${encodeURIComponent(orgId)}/checkout-platform-fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ checkoutPlatformFeeUgx: n }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFeeBusyId(null);
    }
  }

  async function saveOrgFx(orgId: string) {
    setFxBusyId(orgId);
    setError(null);
    try {
      const kind = (fxKindDrafts[orgId] ?? "inherit") as "inherit" | "none" | "fixed" | "buffer_pct";
      const body: Record<string, unknown> = { fxOverrideKind: kind };
      if (kind === "fixed") {
        const n = parseInt((fxUgxDrafts[orgId] ?? "").replace(/\s/g, ""), 10);
        if (!n || n <= 0) throw new Error("FX fixed: enter a positive UGX per 1 TON.");
        body.fxOverrideUgxPerTon = n;
        body.fxOverrideBufferPct = parseFloat(fxBufferDrafts[orgId] ?? "0") || 0;
      } else if (kind === "buffer_pct") {
        const pct = parseFloat(fxBufferDrafts[orgId] ?? "");
        if (!Number.isFinite(pct)) throw new Error("FX buffer: enter a numeric %.");
        body.fxOverrideUgxPerTon = null;
        body.fxOverrideBufferPct = pct;
      } else {
        body.fxOverrideUgxPerTon = null;
        body.fxOverrideBufferPct = 0;
      }
      const r = await fetch(`/api/master/organizations/${encodeURIComponent(orgId)}/fx`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setFxBusyId(null);
    }
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    setError(null);
    try {
      const r = await fetch("/api/master/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          slug,
          registrationContactEmail: contact || undefined,
          registrationNote: note,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Create failed");
      setCreateMsg(
        (j as { message?: string }).message ?? `Created tenant "${j.organization?.slug ?? slug}".`,
      );
      setName("");
      setSlug("");
      setContact("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminMsg(null);
    setError(null);
    try {
      const r = await fetch("/api/master/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          name: adminName,
          organizationId: adminOrgId,
          sendInviteEmail: adminSendInviteEmail,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not create admin");
      const sent = (j as { emailSent?: boolean }).emailSent;
      setAdminMsg(
        sent
          ? `School admin created (${j.admin?.email ?? adminEmail}). An ODEL HUB invite email was sent with sign-in instructions.`
          : `School admin created (${j.admin?.email ?? adminEmail}). Email was not sent — share /school/login credentials manually (check RESEND_*).`,
      );
      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create admin");
    }
  }

  return (
    <div className="space-y-10 text-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400/90">Organizations</p>
          {tierSegment ? (
            <div className="mt-2 rounded-xl border border-white/10 bg-[#0a101f]/80 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/90">
                {registrationSegmentTitle(tierSegment)}
              </p>
              <p className="mt-1 text-sm text-slate-400">{registrationSegmentSubtitle(tierSegment)}</p>
              <Link href="/admin/master/organizations" className="mt-2 inline-block text-xs text-cyan-300 hover:underline">
                Show all tenants
              </Link>
            </div>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold text-white">Tenants &amp; provisioning</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Create pending workspaces, approve them to clone programmes and FX from the{" "}
            <code className="text-cyan-200/90">default</code> template, reject unwanted requests, and create org-scoped
            admin logins. Self-serve schools must <strong className="text-slate-300">verify their registration email</strong>{" "}
            before you can approve the workspace.             Active slugs power public checkout at{" "}
            <span className="font-mono text-slate-400">/pay/&lt;slug&gt;</span> (TON + OpenPayGB: Mbiyo / LivePay rails); Mbiyo
            webhooks
            are
            shared across tenants via <span className="font-mono text-slate-500">NEXT_PUBLIC_APP_URL</span>.
          </p>
        </div>
        <Link
          href="/admin/master"
          className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-100 hover:border-amber-400/50"
        >
          ← Manager overview
        </Link>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-sm font-semibold text-white">Register a new tenant</h2>
        <form onSubmit={createOrg} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">School / workspace name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">URL slug (unique)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              placeholder="e.g. kampala-campus"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Registration contact email</label>
            <input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <p className="mt-1 text-[11px] text-slate-600">
              If provided, marked verified immediately (master-provisioned). Self-serve schools must click the ODEL HUB
              email link before you can approve.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Create pending tenant
            </button>
            {createMsg ? <p className="mt-2 text-sm text-emerald-400">{createMsg}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-sm font-semibold text-white">Create org admin</h2>
        <p className="mt-1 text-xs text-slate-500">Only for an active tenant. Password min. 10 characters.</p>
        <form onSubmit={createAdmin} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-500">Organization</label>
            <select
              value={adminOrgId}
              onChange={(e) => setAdminOrgId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            >
              <option value="">Select…</option>
              {visibleOrgs
                .filter((o) => o.tenantStatus === "active")
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.slug})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Display name (optional)</label>
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Password</label>
            <div className="mt-1">
              <PasswordRevealInput
                value={adminPassword}
                onChange={setAdminPassword}
                required
                minLength={10}
                autoComplete="new-password"
                className="w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex items-end sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={adminSendInviteEmail}
                onChange={(e) => setAdminSendInviteEmail(e.target.checked)}
                className="rounded border-slate-600"
              />
              Email password-set link (Resend)
            </label>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Create org admin
            </button>
            {adminMsg ? <p className="mt-2 text-sm text-emerald-400">{adminMsg}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-5">
        <h2 className="text-sm font-semibold text-cyan-100">TON treasury wallet per school</h2>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
          Tuition paid with TON is sent to this address (shown on checkout). Leave empty to use{" "}
          <code className="rounded bg-black/30 px-1 text-slate-400">ODELHUB_TON_WALLET_ADDRESS</code> from deployment
          env. The confirm cron scans each distinct wallet used by pending payments.
        </p>
      </section>

      <section id="fx-overrides" className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-5">
        <h2 className="text-sm font-semibold text-cyan-100">TON / UGX rate override per school</h2>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
          Override the live median for a specific tenant: fixed UGX per 1 TON, or a buffer % on top of the live median.
          Use <strong className="font-medium text-slate-400">inherit</strong> to follow the{" "}
          <Link href="/admin/master#ton-ugx-rate" className="text-cyan-200/90 underline hover:text-cyan-200">
            platform-wide FX
          </Link>
          . <strong className="font-medium text-slate-400">none</strong> forces live/DB only (ignores platform override).
        </p>
      </section>

      <section id="checkout-platform-fees" className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-5">
        <h2 className="text-sm font-semibold text-amber-100">Transaction / processing charge (UGX) per school</h2>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
          Per-tenant fixed amount added to every tuition quote and payment (the processing line on receipts). Use{" "}
          <code className="rounded bg-black/30 px-1 text-cyan-200/90">-1</code> so this school inherits the{" "}
          <strong className="font-medium text-slate-400">platform default</strong> set on{" "}
          <Link href="/admin/master#platform-processing-fee" className="text-amber-200/90 underline hover:text-amber-100">
            Master overview → Default transaction / processing charge
          </Link>
          , which in turn uses <code className="rounded bg-black/30 px-1 text-slate-500">CHECKOUT_PLATFORM_FEE_UGX</code>{" "}
          when that platform default is <code className="rounded bg-black/30 px-1 text-cyan-200/90">-1</code>. Use{" "}
          <code className="rounded bg-black/30 px-1 text-cyan-200/90">0</code> for no fee for this school only, or a
          positive integer for a fixed UGX charge regardless of the platform default.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Organizations</h2>
          <button type="button" onClick={() => void load()} className="text-xs text-slate-400 underline hover:text-white">
            Refresh
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          <strong className="text-slate-400">Favicon</strong>: upload <code className="text-cyan-200/80">favicon.ico</code>{" "}
          (or PNG ≤256KB). Shown on <code className="text-cyan-200/80">/pay/&lt;slug&gt;</code> when the tenant is active.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : visibleOrgs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {tierSegment ? "No organizations in this product line yet." : "No organizations yet."}
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-4 lg:hidden">
              {visibleOrgs.map((o) => (
                <MasterOrgMobileCard
                  key={o.id}
                  org={o as MasterOrgRow}
                  walletDraft={walletDrafts[o.id] ?? o.destinationWallet ?? ""}
                  feeDraft={feeDrafts[o.id] ?? String(o.checkoutPlatformFeeUgx ?? -1)}
                  fxKind={fxKindDrafts[o.id] ?? o.fxOverrideKind ?? "inherit"}
                  fxUgx={fxUgxDrafts[o.id] ?? ""}
                  fxBuffer={fxBufferDrafts[o.id] ?? String(o.fxOverrideBufferPct ?? 0)}
                  busyId={busyId}
                  faviconBusyId={faviconBusyId}
                  feeBusyId={feeBusyId}
                  walletBusyId={walletBusyId}
                  fxBusyId={fxBusyId}
                  onWalletChange={(v) => setWalletDrafts((prev) => ({ ...prev, [o.id]: v }))}
                  onFeeChange={(v) => setFeeDrafts((prev) => ({ ...prev, [o.id]: v }))}
                  onFxKindChange={(v) => setFxKindDrafts((prev) => ({ ...prev, [o.id]: v }))}
                  onFxUgxChange={(v) => setFxUgxDrafts((prev) => ({ ...prev, [o.id]: v }))}
                  onFxBufferChange={(v) => setFxBufferDrafts((prev) => ({ ...prev, [o.id]: v }))}
                  onSaveWallet={() => void saveDestinationWallet(o.id)}
                  onSaveFee={() => void savePlatformFee(o.id)}
                  onSaveFx={() => void saveOrgFx(o.id)}
                  onFaviconFile={(file) => void uploadFavicon(o, file)}
                  onRemoveFavicon={() => void removeFavicon(o)}
                  onApprove={() => void patchOrg(o.id, "approve")}
                  onReject={() => void patchOrg(o.id, "reject")}
                  onReopen={() => void patchOrg(o.id, "reopen")}
                  onResendVerification={() => void resendVerification(o)}
                />
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Slug</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Unit / parent</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Counts</th>
                  <th className="py-2 pr-3">TON treasury</th>
                  <th className="py-2 pr-3">Processing UGX</th>
                  <th className="py-2 pr-3">FX override</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">Email verify</th>
                  <th className="py-2 pr-3">Favicon</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrgs.map((o) => (
                  <MasterOrgTableRow
                    key={o.id}
                    org={o as MasterOrgRow}
                    drafts={{
                      wallet: walletDrafts[o.id] ?? o.destinationWallet ?? "",
                      fee: feeDrafts[o.id] ?? String(o.checkoutPlatformFeeUgx ?? -1),
                      fxKind: fxKindDrafts[o.id] ?? o.fxOverrideKind ?? "inherit",
                      fxUgx: fxUgxDrafts[o.id] ?? "",
                      fxBuffer: fxBufferDrafts[o.id] ?? String(o.fxOverrideBufferPct ?? 0),
                    }}
                    busy={{ busyId, faviconBusyId, feeBusyId, walletBusyId, fxBusyId }}
                    handlers={{
                      onWalletChange: (v) => setWalletDrafts((prev) => ({ ...prev, [o.id]: v })),
                      onFeeChange: (v) => setFeeDrafts((prev) => ({ ...prev, [o.id]: v })),
                      onFxKindChange: (v) => setFxKindDrafts((prev) => ({ ...prev, [o.id]: v })),
                      onFxUgxChange: (v) => setFxUgxDrafts((prev) => ({ ...prev, [o.id]: v })),
                      onFxBufferChange: (v) => setFxBufferDrafts((prev) => ({ ...prev, [o.id]: v })),
                      onSaveWallet: () => void saveDestinationWallet(o.id),
                      onSaveFee: () => void savePlatformFee(o.id),
                      onSaveFx: () => void saveOrgFx(o.id),
                      onFaviconFile: (file) => void uploadFavicon(o, file),
                      onRemoveFavicon: () => void removeFavicon(o),
                      onApprove: () => void patchOrg(o.id, "approve"),
                      onReject: () => void patchOrg(o.id, "reject"),
                      onReopen: () => void patchOrg(o.id, "reopen"),
                      onResendVerification: () => void resendVerification(o),
                    }}
                    faviconInputRef={(el) => {
                      inputRefs.current[o.id] = el;
                    }}
                    onFaviconUploadClick={() => inputRefs.current[o.id]?.click()}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
