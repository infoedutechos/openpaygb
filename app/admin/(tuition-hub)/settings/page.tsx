"use client";

import { AdminAccountPasswordSection } from "@/components/admin/AdminAccountPasswordSection";
import { TuitionHubCheckoutExplainer } from "@/components/admin/TuitionHubCheckoutExplainer";
import { TenantList } from "@/components/tuition/TenantList";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-2 max-w-lg text-sm text-slate-400">
          <strong className="font-medium text-slate-300">TON treasury wallet</strong> and checkout processing fee per school
          are configured in the{" "}
          <a href="/admin/master/organizations" className="text-cyan-300 underline hover:text-cyan-200">
            Manager console → Organizations
          </a>
          . Empty TON wallet uses <code className="font-mono text-slate-500">ODELHUB_TON_WALLET_ADDRESS</code> from env.
          Branding and FX sources will be added here.{" "}
          <strong className="font-medium text-slate-300">Checkout processing fee (UGX)</strong> uses the same Organizations
          screen. Value <span className="font-mono text-cyan-200/90">-1</span> means inherit the
          platform default from <span className="text-slate-500">Master overview</span> (which may still use{" "}
          <span className="font-mono text-slate-500">CHECKOUT_PLATFORM_FEE_UGX</span> when that default is{" "}
          <span className="font-mono text-cyan-200/90">-1</span>); zero or more fixes the fee for that tenant on quotes and
          receipts. OpenPayGlobal (MbiyoPay) confirmations depend on the platform webhook URL
          in production—see the sidebar note on other tuition pages.
        </p>
        <TuitionHubCheckoutExplainer className="mt-6 max-w-2xl" />
        <TenantList
          className="mt-8 max-w-2xl"
          title="Active schools (pay checkout)"
          description="Open tuition pay for any tenant."
        />
      </div>

      <AdminAccountPasswordSection
        absentTitle="Tuition admin password"
        absentHint="Password changes apply to the email/password you use for this tuition hub (master or school admin). If you only use another admin session here, open Admin login in another tab and sign in with your ODEL HUB admin account, then return to this page."
      />
    </div>
  );
}
