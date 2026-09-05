"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import type { TenantRow } from "@/components/tuition/TenantList";
import {
  institutionTierFromSegmentParam,
  type RegistrationSegment,
} from "@/lib/institution-tier";
import { LOGIN_CHOOSER_PATH } from "@/lib/login-entry";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/staff";
  const segmentRaw = searchParams.get("segment");
  const tier = institutionTierFromSegmentParam(segmentRaw);
  const segment: RegistrationSegment | null =
    segmentRaw === "schools" || segmentRaw === "higher" ? segmentRaw : null;

  const [orgs, setOrgs] = useState<TenantRow[]>([]);
  const [orgQuery, setOrgQuery] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [orgResolvedLabel, setOrgResolvedLabel] = useState<string | null>(null);
  const [staffCode, setStaffCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const heading = useMemo(() => {
    if (segment === "schools") return "Staff Login for Schools";
    if (segment === "higher") return "Staff Login for Higher Institutions";
    return "Staff portal";
  }, [segment]);

  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [orgs, orgQuery]);

  useEffect(() => {
    void (async () => {
      const qp = tier ? `?tier=${encodeURIComponent(tier)}` : "";
      const r = await fetch(`/api/public/organizations${qp}`);
      if (!r.ok) return;
      const j = (await r.json()) as { organizations?: TenantRow[] };
      const list = j.organizations ?? [];
      setOrgs(list);
    })();
  }, [tier]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setListOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Staff ID → auto-select institution when the ID is unique.
  useEffect(() => {
    const code = staffCode.trim().toUpperCase();
    if (code.length < 4) return;
    const t = window.setTimeout(() => {
      void (async () => {
        const qp = new URLSearchParams({ staffCode: code });
        if (segment) qp.set("segment", segment);
        const r = await fetch(`/api/public/staff-org-hint?${qp}`);
        if (!r.ok) return;
        const j = (await r.json()) as {
          match?: { organizationSlug: string; organizationName: string; staffName?: string } | null;
        };
        if (!j.match) return;
        setOrganizationSlug(j.match.organizationSlug);
        setOrgQuery(j.match.organizationName);
        setOrgResolvedLabel(
          `Matched ${j.match.organizationName} from Staff ID${j.match.staffName ? ` (${j.match.staffName})` : ""}`,
        );
        setListOpen(false);
      })();
    }, 350);
    return () => window.clearTimeout(t);
  }, [staffCode, segment]);

  function pickOrg(o: TenantRow) {
    setOrganizationSlug(o.slug);
    setOrgQuery(o.name);
    setOrgResolvedLabel(null);
    setListOpen(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          // Send typed name or slug — server resolves via Staff ID if this is wrong.
          organizationSlug: (organizationSlug || orgQuery).trim(),
          staffCode: staffCode.trim(),
          password,
          institutionTier: tier ?? undefined,
        }),
      });
      const j = (await r.json()) as {
        error?: string;
        staff?: { organizationName?: string; organizationSlug?: string };
      };
      if (!r.ok) throw new Error(j.error ?? "Sign-in failed");
      if (j.staff?.organizationName) {
        setOrgQuery(j.staff.organizationName);
        setOrganizationSlug(j.staff.organizationSlug ?? organizationSlug);
      }
      router.replace(next.startsWith("/") ? next : "/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white">{heading}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with your <strong className="text-slate-300">Staff ID</strong> and portal password.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#0a101f] p-6">
        <div ref={wrapRef} className="relative">
          <label className="block text-xs text-slate-500">
            School / institution
            <input
              value={orgQuery}
              onChange={(e) => {
                setOrgQuery(e.target.value);
                setOrganizationSlug("");
                setOrgResolvedLabel(null);
                setListOpen(true);
              }}
              onFocus={() => setListOpen(true)}
              placeholder="Type to search…"
              autoComplete="organization"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          {orgResolvedLabel ? (
            <p className="mt-1 text-[11px] text-emerald-300/90">{orgResolvedLabel}</p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              Type a name to filter. Your Staff ID can still open the correct school if the name is mistyped.
            </p>
          )}
          {listOpen && filteredOrgs.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/15 bg-[#0d1526] shadow-xl">
              {filteredOrgs.map((o) => (
                <li key={o.slug}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-100 hover:bg-cyan-950/50"
                    onClick={() => pickOrg(o)}
                  >
                    <span className="font-medium">{o.name}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{o.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <label className="block text-xs text-slate-500">
          Staff ID
          <input
            value={staffCode}
            onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
            autoComplete="username"
            placeholder="e.g. STF-2026-0001"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white"
            required
          />
        </label>
        <label className="block text-xs text-slate-500">
          Portal password
          <PasswordRevealInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            required
          />
        </label>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in to staff dashboard"}
        </button>
      </form>
      <p className="text-center text-xs text-slate-500">
        Admin / bursar?{" "}
        <Link href="/admin/login" className="text-cyan-400 hover:underline">
          Admin login
        </Link>
        {" · "}
        <Link href={LOGIN_CHOOSER_PATH} className="text-cyan-400 hover:underline">
          All login options
        </Link>
      </p>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-400">Loading…</p>}>
      <LoginInner />
    </Suspense>
  );
}
