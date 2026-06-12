import type { Metadata } from "next";
import Link from "next/link";
import { PlatformPolicyDocument } from "@/components/policies/PlatformPolicyDocument";
import { PLATFORM_PAYMENT_PROVIDER_POLICY } from "@/lib/platform-policy-content";
import { PAYMENT_PROVIDER_CATALOG } from "@/lib/payment-providers-catalog";

export const metadata: Metadata = {
  title: "Payment Provider Policy",
  description: PLATFORM_PAYMENT_PROVIDER_POLICY.summary,
};

export default function PlatformPaymentProvidersPolicyPage() {
  const providers = PAYMENT_PROVIDER_CATALOG.filter((p) => p.toggleable);

  return (
    <PlatformPolicyDocument policy={PLATFORM_PAYMENT_PROVIDER_POLICY}>
      <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead className="border-b border-white/10 bg-slate-900/60 text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Provider</th>
              <th className="px-3 py-2 font-semibold">Rail</th>
              <th className="px-3 py-2 font-semibold">Brand at checkout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {providers.map((p) => (
              <tr key={p.code}>
                <td className="px-3 py-2.5 font-medium text-white">{p.name}</td>
                <td className="px-3 py-2.5 font-mono text-[11px]">{p.paymentRail}</td>
                <td className="px-3 py-2.5">{p.brandLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Master Admin controls which providers are active. See{" "}
        <Link href="/help" className="text-cyan-300 hover:underline">
          Help
        </Link>{" "}
        for checkout troubleshooting.
      </p>
    </PlatformPolicyDocument>
  );
}
