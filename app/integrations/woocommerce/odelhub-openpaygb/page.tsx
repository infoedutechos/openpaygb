import Link from "next/link";
import { getWooCommercePluginMeta } from "@/lib/woocommerce-plugin-download";

export const dynamic = "force-dynamic";

export default function OdelhubOpenPayGbPluginPage() {
  const meta = getWooCommercePluginMeta();
  const missing = meta.files.length === 0;

  return (
    <main className="min-h-dvh bg-[#070b14] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          integrations / woocommerce
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{meta.pluginName}</h1>
        <p className="mt-2 font-mono text-sm text-cyan-200/90">{meta.path}</p>
        <p className="mt-3 text-sm text-slate-400">
          Version {meta.version}. Installable WordPress plugin — creates{" "}
          <code className="text-slate-300">POST /api/partner/v1/charges</code>, redirects to hosted{" "}
          <code className="text-slate-300">/opgb/checkout/…</code>, and marks Woo orders paid on{" "}
          <code className="text-slate-300">charge.confirmed</code>.
        </p>

        {missing ? (
          <p className="mt-6 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
            Plugin files are not present in this deployment. Redeploy from the repository that includes{" "}
            <code className="text-rose-100">{meta.path}</code>.
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={meta.downloadUrl}
              className="inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Download installable plugin (.zip)
            </a>
            <Link
              href="/integrations/woocommerce"
              className="inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm text-slate-200 hover:bg-white/5"
            >
              ← WooCommerce integrations
            </Link>
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-white">Package contents</h2>
          <ul className="mt-3 space-y-1 rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-slate-400">
            {meta.files.map((f) => (
              <li key={f}>odelhub-openpaygb/{f}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-xl border border-violet-500/25 bg-violet-950/20 p-5 text-sm text-slate-400">
          <p className="font-semibold text-violet-100">After install</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Developers dashboard →{" "}
              <Link href="/developers/dashboard#api-keys" className="text-violet-300 hover:underline">
                API keys
              </Link>{" "}
              (scopes <code className="text-slate-300">charges:create</code>,{" "}
              <code className="text-slate-300">charges:read</code>)
            </li>
            <li>
              Register store webhook URL ending in{" "}
              <code className="text-slate-300">/wp-json/odelhub-openpaygb/v1/webhook</code> under{" "}
              <Link href="/developers/dashboard#webhooks" className="text-violet-300 hover:underline">
                Webhooks
              </Link>
            </li>
            <li>
              Full steps:{" "}
              <Link href="/api/docs/platform/WOOCOMMERCE.md" className="text-violet-300 hover:underline">
                WOOCOMMERCE.md
              </Link>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
