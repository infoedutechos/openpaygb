import Link from "next/link";
import { getWooCommercePluginMeta } from "@/lib/woocommerce-plugin-download";

export const dynamic = "force-dynamic";

export default function WooCommerceIntegrationsPage() {
  const meta = getWooCommercePluginMeta();

  return (
    <main className="min-h-dvh bg-[#070b14] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Integrations</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">WooCommerce · OpenPayGB</h1>
        <p className="mt-3 text-sm text-slate-400">
          Accept Uganda Mobile Money and OpenPayGB hosted checkout from WordPress / WooCommerce via the Partner API.
        </p>

        <div className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6">
          <p className="text-sm font-semibold text-cyan-100">Plugin package</p>
          <p className="mt-2 font-mono text-sm text-cyan-200">
            <Link href="/integrations/woocommerce/odelhub-openpaygb" className="underline-offset-2 hover:underline">
              {meta.path}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={meta.downloadUrl}
              className="inline-flex rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Download {meta.pluginName} (.zip)
            </a>
            <Link
              href="/integrations/woocommerce/odelhub-openpaygb"
              className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
            >
              Plugin details
            </Link>
            <Link
              href="/developers/dashboard#woocommerce"
              className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
            >
              Developers dashboard
            </Link>
          </div>
        </div>

        <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-slate-400">
          <li>Download the zip and unzip into <code className="text-slate-300">wp-content/plugins/odelhub-openpaygb/</code>.</li>
          <li>Activate <strong className="font-medium text-slate-200">OpenPayGB for WooCommerce</strong> in WP Admin.</li>
          <li>
            Paste your Partner API key + webhook signing secret from{" "}
            <Link href="/developers/dashboard#api-keys" className="text-emerald-300 hover:underline">
              Developers → API keys
            </Link>{" "}
            /{" "}
            <Link href="/developers/dashboard#webhooks" className="text-emerald-300 hover:underline">
              Webhooks
            </Link>
            .
          </li>
        </ol>

        <p className="mt-8 text-xs text-slate-500">
          Guide:{" "}
          <Link href="/api/docs/platform/WOOCOMMERCE.md" className="text-cyan-300 hover:underline">
            docs/platform/WOOCOMMERCE.md
          </Link>
        </p>
      </div>
    </main>
  );
}
