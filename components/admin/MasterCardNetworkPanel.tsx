"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

/**
 * Master Admin: bank-card acquiring + network Visa/MC issuing readiness.
 * Credentials live in Deployment environment; this panel probes status.
 */
export function MasterCardNetworkPanel() {
  const [acquiring, setAcquiring] = useState<{
    enabled?: boolean;
    configured?: boolean;
    provider?: string | null;
    webhookUrl?: string | null;
  } | null>(null);
  const [issuing, setIssuing] = useState<{
    enabled?: boolean;
    configured?: boolean;
    provider?: string | null;
    webhookUrl?: string | null;
    visaIssuePathSet?: boolean;
    note?: string;
  } | null>(null);
  const [probe, setProbe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, i] = await Promise.all([
        fetch("/api/public/card-acquiring-config").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/public/card-issuing-config").then((r) => (r.ok ? r.json() : null)),
      ]);
      setAcquiring(a);
      setIssuing(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load card network status");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function probeVisa() {
    setBusy(true);
    setProbe(null);
    setError(null);
    try {
      const r = await fetchJson("/api/master/card-issuing/issue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          probeHelloWorld: true,
          holderName: "Probe",
          email: "probe@openpaygb.local",
        }),
      });
      const parsed = await readJsonResponse<{
        probe?: { ok?: boolean; status?: number; body?: string };
        error?: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      const p = parsed.data.probe;
      setProbe(
        p
          ? `Visa hello-world: ${p.ok ? "OK" : "FAIL"} (HTTP ${p.status})${p.body ? ` — ${p.body.slice(0, 120)}` : ""}`
          : "No probe payload",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Visa probe failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="card-network" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200/90">
            Card network (Visa / Mastercard)
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Acquiring = pay tuition with a bank card (Flutterwave/Paystack). Issuing = network virtual cards via LivePay or
            your{" "}
            <a
              href="https://developer.visa.com/"
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 underline"
            >
              developer.visa.com
            </a>{" "}
            project (BIN sponsor required for live PANs). Closed-loop OpenPayGB card is separate.
          </p>
        </div>
        <Link
          href="/admin/master#deployment-environment"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
        >
          Edit secrets →
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Acquiring</p>
          <p className="mt-1 text-sm text-white">
            {acquiring?.configured ? (
              <span className="text-emerald-300">Configured ({acquiring.provider ?? "—"})</span>
            ) : (
              <span className="text-amber-300">Not configured</span>
            )}
          </p>
          {acquiring?.webhookUrl ? (
            <p className="mt-2 break-all font-mono text-[11px] text-slate-500">{acquiring.webhookUrl}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Network issuing</p>
          <p className="mt-1 text-sm text-white">
            {issuing?.configured ? (
              <span className="text-emerald-300">Configured ({issuing.provider ?? "—"})</span>
            ) : (
              <span className="text-amber-300">Scaffold only</span>
            )}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Issue path set: {issuing?.visaIssuePathSet ? "yes" : "no"} ·{" "}
            {issuing?.note ? issuing.note.slice(0, 80) : ""}
          </p>
          {issuing?.webhookUrl ? (
            <p className="mt-2 break-all font-mono text-[11px] text-slate-500">{issuing.webhookUrl}</p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void probeVisa()}
            className="mt-3 rounded-lg border border-violet-500/40 bg-violet-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            Probe Visa hello-world
          </button>
        </div>
      </div>

      {probe ? <p className="mt-3 text-xs text-emerald-200/90">{probe}</p> : null}
      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      <p className="mt-3 text-xs text-slate-600">
        Docs: <code className="text-slate-400">docs/platform/CARD_ISSUING.md</code>
      </p>
    </section>
  );
}
