"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  StudentPaymentsHistory,
  type StudentPaymentRow,
} from "@/components/student/StudentPaymentsHistory";
import { profileFromStudentMe } from "@/lib/profile-mappers";
import { UserProfilePanel } from "@/components/profile/UserProfilePanel";

type Me = {
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    programmeCode: string;
    year: number;
    semester: number;
    organizationName: string;
    organizationSlug: string;
    portalSignInEnabled?: boolean;
    googleSub?: string | null;
    lastLoginAt?: string | null;
    previousLoginAt?: string | null;
    createdAt?: string | null;
    payments: StudentPaymentRow[];
  };
};

export default function MyDashboardPage() {
  const [data, setData] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/student/me", { credentials: "include" });
      if (r.status === 401) {
        setError("signed_out");
        return;
      }
      const j = (await r.json()) as Me;
      setData(j);
    })();
  }, []);

  if (error === "signed_out") {
    return (
      <section className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-8 text-center">
        <p className="text-slate-300">Sign in to open your dashboard.</p>
        <Link
          href="/student/login?next=/my/dashboard"
          className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Student sign in
        </Link>
        <p className="mt-4 text-xs text-slate-500">
          Paid as a guest?{" "}
          <Link href="/student/claim" className="text-cyan-400 hover:underline">
            Claim your portal account
          </Link>
        </p>
      </section>
    );
  }

  if (!data?.student) {
    return <p className="text-slate-500">Loading…</p>;
  }

  const s = data.student;
  const payHref = `/pay/${encodeURIComponent(s.organizationSlug)}`;

  const profile = profileFromStudentMe(s);

  return (
    <section className="space-y-8">
      <UserProfilePanel profile={profile} showWelcome />

      <header className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Quick links</p>
        <p className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
          <Link href="/my/receipts" className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
            Receipts & payment history
          </Link>
          <Link href="/my/profile#password" className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
            Profile &amp; password
          </Link>
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href={payHref}
          className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 to-sky-950/40 p-5 hover:border-cyan-400/50"
        >
          <h2 className="text-sm font-semibold text-white">Tuition checkout</h2>
          <p className="mt-2 text-xs text-slate-400">Open the pay wizard for your school ({s.organizationSlug}).</p>
        </Link>
        <Link
          href="/student/pay"
          className="rounded-xl border border-white/15 bg-[#0d1526]/80 p-5 hover:border-white/25"
        >
          <h2 className="text-sm font-semibold text-white">Student pay flow</h2>
          <p className="mt-2 text-xs text-slate-400">Alternate in-app pay page linked to your account.</p>
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Recent payments</h2>
          <Link href="/my/receipts" className="text-xs font-medium text-sky-400 hover:underline">
            View all & receipts
          </Link>
        </div>
        <div className="mt-3">
          <StudentPaymentsHistory
            payments={s.payments.slice(0, 5)}
            emptyMessage="No payments yet."
          />
        </div>
      </section>
    </section>
  );
}
