import Link from "next/link";
import { DexWalletConnect } from "@/components/dex/DexWalletConnect";
import { HUBS } from "@/lib/ecosystem/hubs";

export default function DexHubPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
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
          Today&apos;s shipped piece is the OpenPayGB UGX card; multi-currency wallet and hybrid DEX are phased next.
        </p>
      </section>
    </div>
  );
}
