"use client";

export type BalanceSlice = {
  index: number;
  subtotalUgx: number;
  platformFeeUgx: number;
  totalUgx: number;
  status: string;
};

export type BalanceInstallmentPlan = {
  installmentPlanId: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: string;
  installmentCount: number;
  scheduleSubtotalUgx: number;
  fullPlanTotalUgx: number;
  paidTotalUgx: number;
  remainingTotalUgx: number;
  nextDueIndex: number | null;
  isComplete: boolean;
  slices: BalanceSlice[];
};

export type BalanceContext = {
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: string;
  expectedSubtotalUgx: number;
  confirmedPaidSubtotalUgx: number;
  remainingSubtotalUgx: number;
  remainingFullPayTotalUgx: number;
  isFullyPaid: boolean;
};

export type BalanceProgressPeriod = {
  year: number;
  semester: number;
  feeLineCount: number;
  tuitionUgx: number;
  functionalFeesUgx: number;
  totalUgx: number;
  hasFeeSchedule: boolean;
  isCompleted?: boolean;
  paidSubtotalUgx?: number;
  paidTotalUgx?: number;
};

export type BalanceProgrammeProgress = {
  programmeCode: string;
  durationYears: number;
  semestersPerYear: number;
  totalSemesters: number;
  source: "configured" | "fee_schedule" | "empty";
  completedSemesters: number;
  remainingSemesters: number;
  completedYears: number;
  remainingYears: number;
  periods: BalanceProgressPeriod[];
  completedPeriods: BalanceProgressPeriod[];
  remainingPeriods: BalanceProgressPeriod[];
};

export type TuitionBalanceData = {
  installmentPlans: BalanceInstallmentPlan[];
  contexts: BalanceContext[];
  progress?: BalanceProgrammeProgress | null;
};

type Props = {
  balance: TuitionBalanceData;
  variant?: "admin" | "student";
  onPayInstallment?: (plan: BalanceInstallmentPlan) => void;
  busy?: boolean;
};

function periodLabel(code: string, year: number, semester: number): string {
  const short = (code.split(/[-/]/)[0] ?? code).trim();
  return `${short} · Y${year} Sem ${semester}`;
}

export function TuitionBalancePanel({ balance, variant = "student", onPayInstallment, busy }: Props) {
  const isAdmin = variant === "admin";
  const plans = balance.installmentPlans.filter((p) => !p.isComplete && p.nextDueIndex);
  const openContexts = balance.contexts.filter((c) => !c.isFullyPaid && c.remainingSubtotalUgx > 0);
  const progress = balance.progress;

  if (plans.length === 0 && openContexts.length === 0 && !progress) {
    return null;
  }

  return (
    <section
      className={
        isAdmin
          ? "rounded-lg border border-amber-200 bg-amber-50/80 px-5 py-4"
          : "rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-4"
      }
    >
      <h2 className={`text-sm font-semibold ${isAdmin ? "text-amber-900" : "text-cyan-200"}`}>
        Tuition balance
      </h2>

      {progress ? (
        <div className={`mt-3 rounded-lg ${isAdmin ? "bg-white" : "bg-[#0d1526]/60"} px-3 py-3 text-sm`}>
          <p className={`font-medium ${isAdmin ? "text-slate-800" : "text-slate-200"}`}>
            Programme progress: {progress.completedSemesters} of {progress.totalSemesters} semesters completed
          </p>
          <p className={`mt-1 ${isAdmin ? "text-slate-600" : "text-slate-400"}`}>
            {progress.durationYears} year{progress.durationYears === 1 ? "" : "s"} · {progress.semestersPerYear} semester
            {progress.semestersPerYear === 1 ? "" : "s"} per year · {progress.remainingYears} year
            {progress.remainingYears === 1 ? "" : "s"} / {progress.remainingSemesters} semester
            {progress.remainingSemesters === 1 ? "" : "s"} remaining
          </p>
          {progress.periods.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {progress.periods.map((period) => (
                <span
                  key={`${period.year}-${period.semester}`}
                  className={
                    period.isCompleted
                      ? "rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                      : isAdmin
                        ? "rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                        : "rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-slate-400"
                  }
                  title={
                    period.hasFeeSchedule
                      ? `UGX ${period.totalUgx.toLocaleString()} across ${period.feeLineCount} fee line(s)`
                      : "No fee schedule configured for this period"
                  }
                >
                  Y{period.year} S{period.semester}: {period.isCompleted ? "Done" : "Remaining"}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {plans.length > 0 ? (
        <ul className={`mt-3 space-y-3 ${isAdmin ? "text-slate-800" : "text-slate-200"}`}>
          {plans.map((plan) => {
            const due = plan.slices.find((s) => s.index === plan.nextDueIndex);
            return (
              <li
                key={plan.installmentPlanId}
                className={
                  isAdmin
                    ? "rounded-md border border-amber-100 bg-white px-3 py-3 text-sm"
                    : "rounded-lg border border-white/10 bg-[#0d1526]/60 px-3 py-3 text-sm"
                }
              >
                <p className="font-medium">
                  {periodLabel(plan.programmeCode, plan.year, plan.semester)} ·{" "}
                  {plan.feeSelectionMode === "year" ? "Year bundle" : "Semester"} · Installments (
                  {plan.installmentCount})
                </p>
                <p className={`mt-1 ${isAdmin ? "text-slate-600" : "text-slate-400"}`}>
                  Paid UGX {plan.paidTotalUgx.toLocaleString()} of {plan.fullPlanTotalUgx.toLocaleString()} ·
                  Remaining UGX {plan.remainingTotalUgx.toLocaleString()}
                </p>
                {due ? (
                  <p className={`mt-1 ${isAdmin ? "text-slate-700" : "text-slate-300"}`}>
                    Next due: installment {plan.nextDueIndex} — UGX {due.totalUgx.toLocaleString()}
                  </p>
                ) : null}
                {onPayInstallment && plan.nextDueIndex ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPayInstallment(plan)}
                    className={
                      isAdmin
                        ? "mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        : "mt-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    }
                  >
                    Pay installment {plan.nextDueIndex}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {openContexts.length > 0 ? (
        <ul className={`mt-3 space-y-2 text-sm ${isAdmin ? "text-slate-700" : "text-slate-300"}`}>
          {openContexts.map((ctx) => (
            <li key={`${ctx.feeSelectionMode}-${ctx.year}-${ctx.semester}`}>
              {periodLabel(ctx.programmeCode, ctx.year, ctx.semester)} (
              {ctx.feeSelectionMode === "year" ? "year" : "semester"}): outstanding UGX{" "}
              {ctx.remainingSubtotalUgx.toLocaleString()}
              {ctx.remainingFullPayTotalUgx !== ctx.remainingSubtotalUgx ? (
                <span className={isAdmin ? "text-slate-500" : "text-slate-500"}>
                  {" "}
                  (incl. fees if paying in full: {ctx.remainingFullPayTotalUgx.toLocaleString()})
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
