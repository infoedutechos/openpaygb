import {
  MBIYO_PAY_INFRA_NAME,
  openPayGlobalLabel,
  openPayGlobalMobileMoneyLabel,
} from "@/lib/open-pay-brand";

/**
 * Shared copy for org Tuition Hub: ties admin screens to payer checkout (fee bundles, line selection, processing UGX).
 * Static markup only so it can be used from server and client pages.
 */
export function TuitionHubCheckoutExplainer({ className }: { className?: string }) {
  return (
    <aside
      className={`rounded-xl border border-cyan-500/15 bg-gradient-to-br from-cyan-950/30 to-[var(--card)] p-4 text-xs leading-relaxed text-slate-400 ${className ?? ""}`}
    >
      <p className="font-semibold text-cyan-100/95">How tuition checkout uses programmes and fees</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 marker:text-cyan-600/70">
        <li>
          <span className="text-slate-400">Schedules under Programs</span> define billable lines (year, semester,
          recurrence: once / per semester / per year, tuition vs functional).
        </li>
        <li>
          At pay time, guests and students choose <strong className="font-medium text-slate-300">semester</strong> or{" "}
          <strong className="font-medium text-slate-300">whole academic year</strong> coverage so the correct pool of
          lines is quoted.
        </li>
        <li>
          They can pay <strong className="font-medium text-slate-300">all</strong> applicable lines in that pool or tick
          specific lines; the quote shows a UGX subtotal for tuition items.
        </li>
        <li>
          A fixed <strong className="font-medium text-slate-300">checkout processing</strong> amount in UGX (transaction
          / processing charge) is added. <strong className="font-medium text-slate-300">Platform masters</strong> set the
          deployment-wide default on <span className="text-slate-500">Master → Default transaction / processing charge</span>;
          each school can override in <span className="text-slate-500">Manager → Organizations</span> (
          <span className="font-mono text-cyan-200/85">-1</span> = inherit platform default). When that platform default
          is also <span className="font-mono text-cyan-200/85">-1</span>,{" "}
          <span className="font-mono text-slate-500">CHECKOUT_PLATFORM_FEE_UGX</span> in the environment is used.
        </li>
        <li>
          Quotes, receipts, PDFs, and payment rows in this hub show{" "}
          <strong className="font-medium text-slate-300">final</strong> UGX totals where a payment exists (fee components
          plus processing when charged).
        </li>
        <li>
          Guest checkout lives at <span className="font-mono text-cyan-200/85">/pay/&lt;orgSlug&gt;</span>; signed-in
          students use the student pay route with the same quote and rail choice (TON or {openPayGlobalLabel}).
        </li>
        <li>
          <strong className="font-medium text-slate-300">{openPayGlobalMobileMoneyLabel}</strong> is your payer-facing
          brand; payins run on <strong className="font-medium text-slate-300">{MBIYO_PAY_INFRA_NAME}</strong>{" "}
          infrastructure (stored rail{" "}
          <span className="font-mono text-cyan-200/85">mbiyo</span>). Configure{" "}
          <span className="font-mono text-slate-500">MBIYO_SECRET_KEY</span> (merchant API) and{" "}
          <span className="font-mono text-slate-500">NEXT_PUBLIC_APP_URL</span> for{" "}
          <span className="font-mono text-slate-500">/api/webhooks/mbiyo</span>.
        </li>
        <li>
          Payment CSV exports keep the original columns, then append feeSelectionMode, includedFeeIds (semicolon-separated),
          tuitionUgx, functionalFeesUgx, and platformFeeUgx.
        </li>
      </ul>
    </aside>
  );
}

export function TuitionHubCheckoutExplainerCompact({ className }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className ?? ""}`}>
      Recorded UGX on payments is the quoted total, including the checkout processing line when your school has one.
      TON checkout and {openPayGlobalLabel} ({MBIYO_PAY_INFRA_NAME} mobile money) use the same ledger once confirmed.
    </p>
  );
}
