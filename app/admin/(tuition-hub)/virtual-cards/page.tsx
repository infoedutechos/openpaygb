"use client";

import { Suspense } from "react";
import Link from "next/link";
import { OpenPayCardsRegistryPanel } from "@/components/admin/OpenPayCardsRegistryPanel";
import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";

function AdminVirtualCardsInner() {
  const { orgSlug, hrefWithOrgSlug } = useMasterOrgSlug();

  return (
    <div className="space-y-8">
      <PageBackLink href={hrefWithOrgSlug("/admin")} label="Admin home" className="hidden md:inline-flex" />
      <header>
        <h1 className="text-xl font-semibold text-white">OpenPayGB Cards</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          {OPEN_PAY_BRAND} cards for your workspace. Fund your admin card below, or review every issued card in the
          registry.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Your admin card</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Pay / fund your OpenPayGB card</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Choose a payment method to issue or top up: <strong className="text-slate-200">Mobile Money</strong>{" "}
              (MTN / Airtel) or <strong className="text-slate-200">TON wallet</strong>. Cash out to MoMo when you need
              funds off the card.
            </p>
          </div>
          <Link
            href={hrefWithOrgSlug("/admin/my-card")}
            className="shrink-0 rounded-lg border border-emerald-400/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/10"
          >
            Full card page →
          </Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Method 1</p>
            <p className="font-semibold text-white">Mobile Money</p>
            <p className="text-xs text-slate-400">MTN or Airtel — approve on your phone</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Method 2</p>
            <p className="font-semibold text-white">TON wallet</p>
            <p className="text-xs text-slate-400">Pay with TonConnect from your wallet</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Cash out</p>
            <p className="font-semibold text-white">Send to MoMo</p>
            <p className="text-xs text-slate-400">Withdraw card balance to phone</p>
          </div>
        </div>

        <OpenPayCardPanel
          apiBase="/api/admin/openpay-card"
          showTuitionHint={false}
          organizationSlug={orgSlug || null}
        />
      </section>

      <OpenPayCardsRegistryPanel
        apiPath="/api/admin/openpay-cards"
        sectionId="admin-virtual-cards"
        showSchoolColumn={false}
        description="Cards for students and admins in your organization. Admin personal cards use programme ADMIN_CARD."
      />
    </div>
  );
}

export default function AdminVirtualCardsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading cards…</p>}>
      <AdminVirtualCardsInner />
    </Suspense>
  );
}
