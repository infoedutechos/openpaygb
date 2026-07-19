import Link from "next/link";
import { DexWalletConnect } from "@/components/dex/DexWalletConnect";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { HUBS } from "@/lib/ecosystem/hubs";

export default function DexHubPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageBackLink href="/" label="ODEL HUB lobby" />
      <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 to-slate-950/80 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)] md:p-8">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-violet-200/90">Dex Hub</p>
        <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Onramp &amp; offramp</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Move between <span className="text-slate-200">TON</span>,{" "}
          <span className="text-slate-200">OpenPayGB</span> (Mbiyo / LivePay rails), and tuition checkout — one ecosystem,
          extensible modules.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={HUBS.dex.routes!.onramp!}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg hover:brightness-110"
          >
            Start onramp
          </Link>
          <Link
            href={HUBS.dex.routes!.offramp!}
            className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-slate-100 hover:border-violet-400/40"
          >
            Start offramp
          </Link>
          <Link
            href={HUBS.dex.routes!.convert!}
            className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-slate-100 hover:border-violet-400/40"
          >
            Convert
          </Link>
          <Link
            href={HUBS.dex.routes!.buy!}
            className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-5 py-3 text-center text-sm font-semibold text-cyan-100 hover:border-cyan-400/50"
          >
            Buy crypto
          </Link>
          <Link
            href={HUBS.dex.routes!.amm!}
            className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-slate-100 hover:border-violet-400/40"
          >
            AMM swap
          </Link>
          <Link
            href={HUBS.dex.routes!.p2p!}
            className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-slate-100 hover:border-violet-400/40"
          >
            P2P market
          </Link>
          <Link
            href={HUBS.tuition.basePath}
            className="rounded-xl px-5 py-3 text-center text-sm font-medium text-slate-400 hover:text-white"
          >
            Tuition pay →
          </Link>
        </div>
      </div>

      <DexWalletConnect />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 p-5 text-sm text-slate-400">
        <h2 className="text-xs font-bold uppercase tracking-wider text-violet-200/85">Architecture</h2>
        <p className="mt-2 leading-relaxed">
          New hubs register in{" "}
          <code className="rounded-md bg-black/40 px-1.5 py-0.5 text-[11px] text-violet-100/90">lib/ecosystem/hubs.ts</code>{" "}
          so routing, landing tabs, and cross-links stay consistent. Add partners, liquidity, or jurisdictions by extending
          that registry and plugging API routes — without forking Tuition or Play shells.
        </p>
        <p className="mt-3 leading-relaxed">
          <span className="text-slate-300">OpenPay Global Token (OPGB)</span> — internal settlement across MoMo, TON, and
          crypto — see <code className="text-[11px] text-violet-100/90">docs/OPGB_TOKEN_ECOSYSTEM.md</code> in the repo.
          Phase 2 ships OPGB ledger, FX-quoted multi-currency wallet display, and the fiat buy wizard at{" "}
          <Link href="/dex/buy" className="text-cyan-300 underline">
            /dex/buy
          </Link>
          . Phase 3 adds hybrid AMM execution and autonomous P2P escrow at{" "}
          <Link href="/dex/p2p" className="text-cyan-300 underline">
            /dex/p2p
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
