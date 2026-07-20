"use client";

import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

export default function StaffOpenPayCardPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackLink href="/staff" label="Staff home" className="hidden md:inline-flex" />
      <header>
        <p className="text-xs uppercase tracking-wider text-amber-400/80">{OPEN_PAY_BRAND}</p>
        <h1 className="text-2xl font-semibold text-white">My OpenPayGB Card</h1>
        <p className="mt-2 text-sm text-slate-400">
          Reserve, activate with Mobile Money or TON, and fund your personal OpenPayGB card for this school or
          institution.
        </p>
      </header>
      <OpenPayCardPanel apiBase="/api/staff/openpay-card" showTuitionHint={false} />
    </div>
  );
}
