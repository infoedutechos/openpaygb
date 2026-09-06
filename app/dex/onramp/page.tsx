import Link from "next/link";
import { DexWalletConnect } from "@/components/dex/DexWalletConnect";
import { DexPageBack } from "@/components/dex/DexPageBack";
import { HUBS } from "@/lib/ecosystem/hubs";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function DexOnrampPage({ searchParams }: Props) {
  const sp = await searchParams;
  const returnPath = sp.next?.startsWith("/") ? sp.next : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <DexPageBack />
      <div>
        <h1 className="text-2xl font-semibold text-white">Get funds</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          This hub routes you to funded rails — it is not a standalone card onramp. Use{" "}
          <strong className="text-slate-200">tuition checkout</strong> (Mbiyo / LivePay / TON where configured) or{" "}
          <strong className="text-slate-200">TON Connect</strong> below, then continue payment.
        </p>
      </div>
      <DexWalletConnect variant="inline" />
      <ul className="space-y-3 text-sm text-slate-300">
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" aria-hidden />
          Configure <code className="text-xs text-cyan-100/90">MBIYO_SECRET_KEY</code> in{" "}
          <code className="text-xs">.env</code> (never commit it). Restart the dev server after changes.
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
          Use tuition pay for priced flows (
          <Link href={HUBS.tuition.basePath} className="text-cyan-300 underline-offset-2 hover:underline">
            open checkout
          </Link>
          ) — same rails as the rest of ODELPay HUB.
        </li>
      </ul>
      {returnPath ? (
        <Link
          href={returnPath}
          className="inline-flex rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          Continue your payment
        </Link>
      ) : (
        <Link
          href={HUBS.tuition.basePath}
          className="inline-flex rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          Go to tuition checkout
        </Link>
      )}
    </div>
  );
}
