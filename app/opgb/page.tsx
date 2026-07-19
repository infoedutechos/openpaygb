import Link from "next/link";
import { DexWalletConnect } from "@/components/dex/DexWalletConnect";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

export default function OpgbPlatformPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageBackLink href="/" label="ODEL HUB lobby" />
      <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/50 to-slate-950/80 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)] md:p-8">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-violet-200/90">
          {OPEN_PAY_BRAND}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Global payments platform</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Closed-loop UGX card, OPGB wallet, MoMo and TON rails, Dex buy/swap/P2P — standalone entry for consumers and
          partners under the ODEL HUB ecosystem.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/student/card"
            data-track="Activate OpenPayGB Card with Mobile Money"
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110"
          >
            Activate card with Mobile Money
          </Link>
          <Link
            href="/dex"
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg hover:brightness-110"
          >
            Open Dex Hub
          </Link>
          <Link
            href="/student/login"
            className="rounded-xl border border-violet-400/35 bg-violet-500/15 px-5 py-3 text-center text-sm font-semibold text-violet-50 hover:border-violet-300/50"
          >
            Student wallet
          </Link>
          <Link
            href="/dex/buy"
            className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-slate-100 hover:border-violet-400/40"
          >
            Buy crypto
          </Link>
          <Link
            href="/dex/p2p"
            className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-slate-100 hover:border-violet-400/40"
          >
            P2P market
          </Link>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Card activation: sign in as a student, reserve your {OPEN_PAY_BRAND} card, then pay the issue fee with MTN or
          Airtel Mobile Money (TON also available).
        </p>
      </div>
      <DexWalletConnect />
    </div>
  );
}
