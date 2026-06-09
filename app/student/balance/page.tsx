"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TuitionBalancePanel,
  type TuitionBalanceData,
} from "@/components/tuition/TuitionBalancePanel";

export default function StudentTuitionBalancePage() {
  const [balance, setBalance] = useState<TuitionBalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/student/balance", { credentials: "include" });
        if (r.status === 401) {
          setError("Signed out");
          return;
        }
        if (!r.ok) {
          const j = (await r.json()) as { error?: string };
          throw new Error(j.error ?? "Could not load balance");
        }
        const j = (await r.json()) as { balance?: TuitionBalanceData | null };
        setBalance(j.balance ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error) {
    return (
      <section className="text-slate-300">
        <p className="text-rose-400">{error}</p>
        <Link href="/student/login" className="mt-4 inline-block text-cyan-400 hover:underline">
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 text-slate-200">
      <header className="border-b border-white/10 pb-5">
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Student portal</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Tuition balance</h1>
        <p className="mt-2 text-sm text-slate-400">
          See what you have already paid and what remains by year, semester, or installment plan.
        </p>
        <Link
          href="/student/pay"
          className="mt-3 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Pay tuition
        </Link>
      </header>

      {loading ? <p className="text-sm text-slate-500">Loading balance…</p> : null}

      {!loading && balance ? (
        <TuitionBalancePanel
          balance={balance}
          onPayInstallment={() => {
            window.location.href = "/student/pay";
          }}
        />
      ) : null}

      {!loading && !balance ? (
        <p className="text-sm text-slate-500">
          No balance data yet. Pay tuition or contact your school if fees should appear here.
        </p>
      ) : null}
    </section>
  );
}
