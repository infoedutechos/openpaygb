import Link from "next/link";
import { DexWalletConnect } from "@/components/dex/DexWalletConnect";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { OpgbLobbyChrome } from "@/components/opgb/OpgbLobbyChrome";
import { OpgbIntegrationGuide } from "@/components/opgb/OpgbIntegrationGuide";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

const PROVIDER_FEATURES = [
  {
    title: "Hosted checkout",
    body: "Create a charge via API and send customers to a branded OpenPayGB payment page.",
    href: "#checkout",
  },
  {
    title: "Mobile Money rails",
    body: "Collect UGX via MTN & Airtel through LivePay — with sandbox confirm for local development.",
    href: "#charges",
  },
  {
    title: "Webhooks",
    body: "Receive charge.created, charge.confirmed, and charge.failed events with HMAC signatures.",
    href: "#webhooks",
  },
  {
    title: "Wallet & Dex",
    body: "OPGB balances, closed-loop cards, and Dex buy/swap/P2P for ecosystem apps.",
    href: "#dex",
  },
] as const;

export default function OpgbPlatformPage() {
  return (
    <OpgbLobbyChrome>
      <div className="mx-auto max-w-3xl space-y-8 pb-16">
        <PageBackLink href="/" label="ODELPay HUB lobby" />

        <section className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/50 to-slate-950/80 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)] md:p-8">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-violet-200/90">
            {OPEN_PAY_BRAND}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Payment provider for your products
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Connect any app, marketplace, school, or fintech product to {OPEN_PAY_BRAND}. Create charges, host
            checkout, verify webhooks, and settle UGX via Mobile Money — without building your own PSP.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/developers/register"
              className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg hover:brightness-110"
            >
              Register your app
            </Link>
            <a
              href="#integrate"
              className="rounded-xl border border-violet-400/35 bg-violet-500/15 px-5 py-3 text-center text-sm font-semibold text-violet-50 hover:border-violet-300/50"
            >
              Integration guide
            </a>
            <Link
              href="/developers/dashboard"
              className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-center text-sm font-semibold text-slate-100 hover:border-violet-400/40"
            >
              Developer dashboard
            </Link>
            <Link
              href="/student/card"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110"
            >
              Activate card
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {PROVIDER_FEATURES.map((f) => (
            <a
              key={f.title}
              href={f.href}
              className="rounded-2xl border border-white/10 bg-[#0a101f] p-5 transition hover:border-violet-400/40"
            >
              <h2 className="text-sm font-semibold text-white">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </a>
          ))}
        </section>

        <OpgbIntegrationGuide />

        <section className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
          <h2 className="text-sm font-semibold text-white">Consumer wallet</h2>
          <p className="mt-2 text-sm text-slate-400">
            End users can hold an {OPEN_PAY_BRAND} card and OPGB balance for tuition and Dex.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/student/login"
              className="rounded-xl border border-violet-400/35 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-50"
            >
              Student wallet
            </Link>
            <Link
              href="/dex/buy"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Buy crypto
            </Link>
            <Link
              href="/dex/p2p"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              P2P market
            </Link>
          </div>
        </section>

        <DexWalletConnect />
      </div>
    </OpgbLobbyChrome>
  );
}
