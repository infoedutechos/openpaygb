"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  const [organizationSlug, setOrganizationSlug] = useState("default");
  const [staffCode, setStaffCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const heading = useMemo(() => {
    if (segment === "schools") return "Staff Login for Schools";
    if (segment === "higher") return "Staff Login for Higher Institutions";
    return "Staff portal";
  }, [segment]);

  useEffect(() => {
    void (async () => {
      const qp = tier ? `?tier=${encodeURIComponent(tier)}` : "";
      const r = await fetch(`/api/public/organizations${qp}`);
      if (!r.ok) return;
      const j = (await r.json()) as { organizations?: TenantRow[] };
      const list = j.organizations ?? [];
      setOrgs(list);
      if (list.length) {
        setOrganizationSlug((prev) => {
          if (prev.trim() && list.some((o) => o.slug === prev.trim().toLowerCase())) return prev;
          return list.find((o) => o.slug === "default")?.slug ?? list[0].slug;
        });
      }
    })();
  }, [tier]);

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
          organizationSlug: organizationSlug.trim().toLowerCase(),
          staffCode: staffCode.trim(),
          password,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Sign-in failed");
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
        <label className="block text-xs text-slate-500">
          School / institution
          <select
            value={organizationSlug}
            onChange={(e) => setOrganizationSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {orgs.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
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
