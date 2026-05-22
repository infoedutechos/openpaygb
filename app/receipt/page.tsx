import Link from "next/link";

export default function ReceiptIndexPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-slate-200">
      <h1 className="text-2xl font-semibold text-white">Receipt lookup</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        Each payment has a unique receipt link, usually shared by email or Telegram after you pay. Open the link you
        received (for example a path like{" "}
        <code className="text-cyan-200/90">/receipt/your-payment-id</code>
        ), or return to Pay to start a payment.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/pay/default"
          className="inline-flex justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Go to Pay
        </Link>
        <Link
          href="/pay/default?programmes=1"
          className="inline-flex justify-center rounded-xl border-2 border-cyan-500/50 bg-cyan-950/25 px-5 py-3 text-sm font-semibold text-cyan-50 hover:border-cyan-400/70"
        >
          Programmes
        </Link>
        <Link href="/" className="inline-flex justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
          Tuition lobby
        </Link>
      </div>
    </div>
  );
}
