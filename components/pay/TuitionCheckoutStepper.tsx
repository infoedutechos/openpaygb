"use client";

import { openPayGlobalStatus } from "@/lib/open-pay-brand";

/** Shared milestone labels for guest + student tuition checkout. */
export const TUITION_CHECKOUT_MILESTONES = [
  { key: "programme", label: "Programme" },
  { key: "fees", label: "Fees" },
  { key: "method", label: "Method" },
  { key: "pay", label: "Pay" },
  { key: "done", label: "Done" },
] as const;

export type TuitionCheckoutMilestoneKey = (typeof TUITION_CHECKOUT_MILESTONES)[number]["key"];

type FlowStepLike =
  | "landing"
  | "select_programme"
  | "fees_breakdown"
  | "choose_pay_method"
  | "mbiyo_waiting"
  | "connect_wallet"
  | "confirm_payment"
  | "processing"
  | "success";

export function milestoneForCheckoutStep(step: FlowStepLike): TuitionCheckoutMilestoneKey {
  switch (step) {
    case "landing":
    case "select_programme":
      return "programme";
    case "fees_breakdown":
      return "fees";
    case "choose_pay_method":
      return "method";
    case "connect_wallet":
    case "confirm_payment":
    case "processing":
    case "mbiyo_waiting":
      return "pay";
    case "success":
      return "done";
    default:
      return "programme";
  }
}

export function paySubstepLabel(step: FlowStepLike, payChannel: "ton" | "mbiyo" | null): string | null {
  if (step === "mbiyo_waiting") return openPayGlobalStatus("approve on your phone");
  if (payChannel === "mbiyo" && step === "processing") return openPayGlobalStatus("confirming");
  if (step === "connect_wallet") return "TON — connect wallet";
  if (step === "confirm_payment") return "TON — confirm transfer";
  if (step === "processing") return "TON — confirming on-chain";
  return null;
}

export function TuitionCheckoutStepper({
  step,
  payChannel = null,
  className,
}: {
  step: FlowStepLike;
  payChannel?: "ton" | "mbiyo" | null;
  className?: string;
}) {
  const active = milestoneForCheckoutStep(step);
  const activeIdx = TUITION_CHECKOUT_MILESTONES.findIndex((m) => m.key === active);
  const sub = paySubstepLabel(step, payChannel);

  return (
    <nav
      aria-label="Checkout progress"
      className={`mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 ${className ?? ""}`}
    >
      <ol className="flex items-center justify-between gap-1">
        {TUITION_CHECKOUT_MILESTONES.map((m, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          return (
            <li key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  current
                    ? "bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
                    : done
                      ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/40"
                      : "bg-slate-800 text-slate-500 ring-1 ring-white/10"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`max-w-[4.5rem] truncate text-center text-[9px] font-semibold uppercase tracking-wide sm:max-w-none sm:text-[10px] ${
                  current ? "text-cyan-100" : done ? "text-emerald-200/80" : "text-slate-600"
                }`}
              >
                {m.label}
              </span>
            </li>
          );
        })}
      </ol>
      {sub ? <p className="mt-2 text-center text-[10px] text-slate-500">{sub}</p> : null}
    </nav>
  );
}
