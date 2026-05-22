"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  StudentPaymentsHistory,
  type StudentPaymentRow,
} from "@/components/student/StudentPaymentsHistory";

type Me = {
  student: {
    name: string;
    organizationName: string;
    payments: StudentPaymentRow[];
  };
};

export default function StudentReceiptsPage() {
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
        <p className="text-slate-300">Sign in to view your payment history and receipts.</p>
        <Link
          href="/student/login?next=/my/receipts"
          className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Student sign in
        </Link>
      </section>
    );
  }

  if (!data?.student) {
    return <p className="text-slate-500">Loading…</p>;
  }

  const s = data.student;

  return (
    <section className="space-y-6">
      <header className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Receipts & history</p>
        <h1 className="text-2xl font-semibold text-white">Payment history</h1>
        <p className="mt-1 text-sm text-slate-400">
          {s.name} · {s.organizationName}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Confirmed payments include a receipt page and PDF download.
        </p>
      </header>

      <StudentPaymentsHistory
        payments={s.payments}
        emptyMessage="No tuition payments on your account yet. After you pay, confirmed rows will show receipts here."
      />
    </section>
  );
}
