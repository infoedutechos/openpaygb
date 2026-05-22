"use client";

import dynamic from "next/dynamic";

const PayProviders = dynamic(
  () => import("@/app/pay/PayProviders").then((m) => ({ default: m.PayProviders })),
  { ssr: false },
);

const StudentTuitionFlow = dynamic(
  () => import("@/components/student/StudentTuitionFlow").then((m) => ({ default: m.StudentTuitionFlow })),
  {
    ssr: false,
    loading: () => (
      <p className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-slate-500">Loading payment flow…</p>
    ),
  },
);

export function StudentPayClient() {
  return (
    <PayProviders>
      <StudentTuitionFlow />
    </PayProviders>
  );
}
