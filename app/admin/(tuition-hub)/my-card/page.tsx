"use client";

import { Suspense } from "react";
import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";

function AdminMyOpenPayCardInner() {
  const { orgSlug, hrefWithOrgSlug } = useMasterOrgSlug();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBackLink href={hrefWithOrgSlug("/admin")} label="Admin home" className="hidden md:inline-flex" />
      <header>
        <p className="text-xs uppercase tracking-wider text-violet-400/80">{OPEN_PAY_BRAND}</p>
        <h1 className="text-2xl font-semibold text-white">OpenPayGB Global Pay Card</h1>
        <p className="mt-2 text-sm text-slate-400">
          Virtual OPGB card — top up with MoMo or TON, send to Mobile Money, block, and track activity.
        </p>
      </header>
      <OpenPayCardPanel
        apiBase="/api/admin/openpay-card"
        showTuitionHint={false}
        organizationSlug={orgSlug || null}
      />
    </div>
  );
}

export default function AdminMyOpenPayCardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading card…</p>}>
      <AdminMyOpenPayCardInner />
    </Suspense>
  );
}
