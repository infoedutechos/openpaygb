import Link from "next/link";
import { DexWalletConnect } from "@/components/dex/DexWalletConnect";
import { homeUrlForHub } from "@/lib/ecosystem/hubs";

export default function DexOfframpPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Offramp</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Move value from <span className="text-slate-200">TON</span> or platform balance to fiat / mobile money. This
          surface is reserved for the next integration pass (payout API, KYC, limits). The registry in{" "}
          <code className="rounded bg-black/35 px-1 text-xs">lib/ecosystem/hubs.ts</code> is ready to wire new providers
          without reshaping Tuition or Play Hub.
        </p>
      </div>
      <DexWalletConnect variant="inline" />
      <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-100/90">
        Offramp flows are not yet connected to a live payout rail. Use TON transfers and tuition receipts for settlement
        today; extend <span className="font-mono text-amber-200/90">/api</span> modules when your payout product is ready.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dex" className="text-sm font-medium text-violet-300 hover:text-white">
          ← Dex Hub home
        </Link>
        <Link href={homeUrlForHub("play")} className="text-sm font-medium text-sky-300 hover:text-white">
          Play Hub →
        </Link>
      </div>
    </div>
  );
}
