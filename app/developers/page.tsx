import type { Metadata } from "next";
import Link from "next/link";
import { ProductLineLanding } from "@/components/ecosystem/ProductLineLanding";

export const metadata: Metadata = {
  title: "ODEL HUB Developers",
  description: "Self-serve Partner API, OAuth app registry, Dex write API, and OPGB integrator docs.",
};

export default function DevelopersHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <ProductLineLanding lineId="developers" />
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/developers/register"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 transition hover:border-emerald-400/50"
        >
          <h2 className="text-lg font-semibold text-emerald-200">Register your app</h2>
          <p className="mt-2 text-sm text-slate-400">
            Autonomous OAuth app registry — client ID, secret, redirect URIs, and default Dex/OPGB scopes.
          </p>
        </Link>
        <Link
          href="/developers/dashboard"
          className="rounded-2xl border border-white/12 bg-slate-900/40 p-6 transition hover:border-emerald-400/35"
        >
          <h2 className="text-lg font-semibold text-white">Developer dashboard</h2>
          <p className="mt-2 text-sm text-slate-400">
            Generate Partner API keys, configure webhook endpoints, and manage branded OPGB integrations.
          </p>
        </Link>
        <Link
          href="/help?hub=dex"
          className="rounded-2xl border border-violet-500/25 bg-violet-950/15 p-6 sm:col-span-2"
        >
          <h2 className="text-lg font-semibold text-violet-200">Integration knowledge base</h2>
          <p className="mt-2 text-sm text-slate-400">
            OPGB wallet, Dex buy/sell, Partner API, OAuth, and SIS checkout cookbooks — searchable at /help.
          </p>
        </Link>
      </section>
    </div>
  );
}
