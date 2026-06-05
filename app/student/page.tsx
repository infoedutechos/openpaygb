"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TuitionBalancePanel,
  type TuitionBalanceData,
} from "@/components/tuition/TuitionBalancePanel";
import {
  StudentPaymentsHistory,
  type StudentPaymentRow,
} from "@/components/student/StudentPaymentsHistory";
import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";

type Me = {
  student: {
    id: string;
    name: string;
    email: string;
    programmeCode: string;
    year: number;
    semester: number;
    organizationName: string;
    organizationSlug: string;
    portalSignInEnabled?: boolean;
    payments: StudentPaymentRow[];
  };
};

export default function StudentDashboardPage() {
  const [data, setData] = useState<Me | null>(null);
  const [balance, setBalance] = useState<TuitionBalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [meRes, balanceRes] = await Promise.all([
        fetch("/api/student/me", { credentials: "include" }),
        fetch("/api/student/balance", { credentials: "include" }),
      ]);
      if (meRes.status === 401) {
        setError("Signed out");
        return;
      }
      const j = (await meRes.json()) as Me;
      setData(j);
      if (balanceRes.ok) {
        const bj = (await balanceRes.json()) as { balance?: TuitionBalanceData | null };
        if (bj.balance) setBalance(bj.balance);
      }
    })();
  }, []);

  if (error) {
    return (
      <section className="mx-auto max-w-lg px-4 py-12 text-slate-300">
        <p className="text-rose-400">{error}</p>
        <Link href="/student/login" className="mt-4 inline-block text-sky-400">
          Sign in
        </Link>
      </section>
    );
  }
  if (!data?.student) {
    return <p className="p-8 text-slate-500">Loading…</p>;
  }

  const s = data.student;
  return (
    <section className="space-y-8 text-slate-200">
      <header className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Student home</p>
        <h1 className="text-2xl font-semibold text-white">{s.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {s.organizationName} · {s.programmeCode} Yr{s.year} Sem{s.semester}
        </p>
        <p className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/my/receipts" className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
            Receipts & payment history
          </Link>
          <Link href="/my/settings" className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
            Change portal password
          </Link>
        </p>
      </header>

      <OpenPayCardPanel />

      {balance ? (
        <TuitionBalancePanel
          balance={balance}
          onPayInstallment={() => {
            window.location.href = "/student/pay";
          }}
        />
      ) : null}

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
            emptyMessage="No payments yet. Pay tuition to see history here."
          />
        </div>
      </section>
    </section>
  );
}
