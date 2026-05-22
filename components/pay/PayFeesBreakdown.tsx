"use client";

import { formatFxRateSource } from "@/lib/fx-rate-label";
import { feePoolForDisplay } from "@/lib/tuition-quote-display";
import {
  INSTALLMENT_COUNT_OPTIONS,
  type InstallmentCountOption,
  type InstallmentSchedule,
} from "@/lib/installments";

export type PayFeesQuote = {
  programmeName: string;
  programmeTrackLabel?: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: "semester" | "year";
  tuitionUgx: number;
  functionalFeesUgx: number;
  subtotalUgx: number;
  platformFeeUgx: number;
  totalUgx: number;
  tonAmount: number;
  ugxPerTon: number;
  rateSource?: string;
  lines: {
    id: string;
    feeKey: string;
    recurrenceLabel: string;
    year: number;
    semester: number;
    lineTotalUgx: number;
  }[];
  poolLines?: PayFeesQuote["lines"];
  installmentSchedule?: InstallmentSchedule;
};

type CoveragePreviewLine = {
  id: string;
  feeKey: string;
  recurrenceLabel: string;
  year: number;
  semester: number;
  lineTotalUgx: number;
};

type CoveragePreview = {
  semester: { totalUgx: number; itemCount: number; lines: CoveragePreviewLine[] } | null;
  year: { totalUgx: number; itemCount: number; lines: CoveragePreviewLine[] } | null;
};

type Props = {
  quote: PayFeesQuote;
  year: number;
  semester: number;
  busy: boolean;
  selectedFeeIds: string[];
  studentName: string;
  studentEmail: string;
  coveragePreview: CoveragePreview;
  installmentCount: InstallmentCountOption;
  onStudentName: (v: string) => void;
  onStudentEmail: (v: string) => void;
  onCoverageMode: (mode: "semester" | "year") => void;
  onToggleFee: (id: string) => void;
  onSelectAll: () => void;
  onInstallmentCountChange: (count: InstallmentCountOption) => void;
  onContinue: () => void;
  /** When true, student is already signed in — hide guest name/email fields. */
  hideGuestIdentity?: boolean;
};

function CoverageLineList({ lines }: { lines: CoveragePreviewLine[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto border-t border-slate-600/50 pt-2 text-[11px]">
      {lines.map((line) => (
        <li key={line.id} className="flex justify-between gap-2 text-slate-300">
          <span className="min-w-0 truncate">
            {line.feeKey}
            <span className="text-slate-500">
              {" "}
              · {line.recurrenceLabel}
              {line.semester > 0 ? ` · Sem ${line.semester}` : ""}
            </span>
          </span>
          <span className="shrink-0 font-mono text-cyan-200/90">UGX {line.lineTotalUgx.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function linesForCoverageMode(
  mode: "semester" | "year",
  quote: PayFeesQuote,
  coveragePreview: CoveragePreview,
): CoveragePreviewLine[] {
  if (quote.feeSelectionMode === mode) {
    return feePoolForDisplay(quote).map((line) => ({
      id: line.id,
      feeKey: line.feeKey,
      recurrenceLabel: line.recurrenceLabel,
      year: line.year,
      semester: line.semester,
      lineTotalUgx: line.lineTotalUgx,
    }));
  }
  const bucket = mode === "semester" ? coveragePreview.semester : coveragePreview.year;
  return bucket?.lines ?? [];
}

function totalForCoverageMode(
  mode: "semester" | "year",
  quote: PayFeesQuote,
  coveragePreview: CoveragePreview,
): number | null {
  if (quote.feeSelectionMode === mode) {
    return quote.subtotalUgx + quote.platformFeeUgx;
  }
  const bucket = mode === "semester" ? coveragePreview.semester : coveragePreview.year;
  return bucket?.totalUgx ?? null;
}

export function PayFeesBreakdown({
  quote,
  year,
  semester,
  busy,
  selectedFeeIds,
  studentName,
  studentEmail,
  coveragePreview,
  installmentCount,
  onStudentName,
  onStudentEmail,
  onCoverageMode,
  onToggleFee,
  onSelectAll,
  onInstallmentCountChange,
  onContinue,
  hideGuestIdentity = false,
}: Props) {
  const feePool = feePoolForDisplay(quote);
  const schedule = quote.installmentSchedule;
  const payingInstallments = installmentCount > 1;
  const semesterLines = linesForCoverageMode("semester", quote, coveragePreview);
  const yearLines = linesForCoverageMode("year", quote, coveragePreview);
  const semesterTotal = totalForCoverageMode("semester", quote, coveragePreview);
  const yearTotal = totalForCoverageMode("year", quote, coveragePreview);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-white">Fees &amp; details</h1>
        <p className="mt-2 text-sm text-slate-400">
          Programme: <span className="text-slate-200">{quote.programmeName}</span>
          {quote.programmeTrackLabel ? (
            <span className="text-slate-500"> · {quote.programmeTrackLabel}</span>
          ) : null}{" "}
          · Code <span className="font-mono text-cyan-200/90">{quote.programmeCode}</span> · Anchor Year{" "}
          <span className="text-slate-200">{quote.year}</span> · Semester{" "}
          <span className="text-slate-200">{quote.semester}</span>
        </p>
      </div>

      <div className="rounded-xl border-2 border-slate-600/70 bg-slate-900/90 p-4 text-sm shadow-lg">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Coverage</p>
        <p className="mt-1 text-xs text-slate-300">
          Pay for this semester only, or the whole academic year (all fee lines for Year {year}). Each card lists
          items and UGX costs for that option.
        </p>
        <div className="mt-4 flex flex-col gap-3" role="group" aria-label="Fee coverage">
          <button
            type="button"
            disabled={busy}
            onClick={() => onCoverageMode("semester")}
            className={`min-h-[5rem] rounded-xl border-2 px-4 py-3 text-left transition-all ${
              quote.feeSelectionMode === "semester"
                ? "border-cyan-400 bg-cyan-900/40 text-white ring-2 ring-cyan-400/30"
                : "border-slate-500 bg-slate-800 text-slate-100 hover:border-cyan-400/60"
            }`}
          >
            <span className="block text-sm font-bold uppercase tracking-wide">Pay for this semester only</span>
            <span className="mt-1 block text-xs text-slate-300">
              Year {year} · Semester {semester}
            </span>
            {semesterLines.length > 0 && semesterTotal != null ? (
              <>
                <span className="mt-2 block font-mono text-sm text-cyan-200">
                  {semesterLines.length} line{semesterLines.length === 1 ? "" : "s"} · UGX{" "}
                  {semesterTotal.toLocaleString()}
                </span>
                <CoverageLineList lines={semesterLines} />
              </>
            ) : (
              <span className="mt-2 block text-xs text-slate-400">Loading items…</span>
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onCoverageMode("year")}
            className={`min-h-[5rem] rounded-xl border-2 px-4 py-3 text-left transition-all ${
              quote.feeSelectionMode === "year"
                ? "border-cyan-400 bg-cyan-900/40 text-white ring-2 ring-cyan-400/30"
                : "border-slate-500 bg-slate-800 text-slate-100 hover:border-cyan-400/60"
            }`}
          >
            <span className="block text-sm font-bold uppercase tracking-wide">Pay for the whole academic year</span>
            <span className="mt-1 block text-xs text-slate-300">All applicable lines for Year {year}</span>
            {yearLines.length > 0 && yearTotal != null ? (
              <>
                <span className="mt-2 block font-mono text-sm text-cyan-200">
                  {yearLines.length} line{yearLines.length === 1 ? "" : "s"} · UGX {yearTotal.toLocaleString()}
                </span>
                <CoverageLineList lines={yearLines} />
              </>
            ) : (
              <span className="mt-2 block text-xs text-slate-400">Loading items…</span>
            )}
          </button>
        </div>
        <button
          type="button"
          disabled={busy || feePool.length === 0}
          onClick={onSelectAll}
          className="mt-4 w-full rounded-lg border border-slate-500 bg-slate-800 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-100 hover:bg-slate-700 disabled:opacity-40"
        >
          Select all items in this group
        </button>
      </div>

      <div className="rounded-xl border-2 border-slate-600/70 bg-slate-900/90 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
          Fee items — {quote.feeSelectionMode === "year" ? "whole academic year" : "this semester only"}
        </p>
        <p className="mt-1 text-xs text-slate-300">Each line shows its UGX total. Uncheck to exclude from your payment.</p>
        {feePool.length === 0 ? (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-3 text-sm text-amber-100">
            No fee lines for this programme and period. Add schedules under Programs in admin, or run{" "}
            <code className="rounded bg-black/40 px-1 text-xs">npm run seed</code> in development.
          </p>
        ) : (
          <ul className="mt-3 max-h-[min(48vh,20rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
            {feePool.map((line) => (
              <li key={line.id}>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 hover:border-cyan-400/50">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                    checked={selectedFeeIds.includes(line.id)}
                    onChange={() => onToggleFee(line.id)}
                    disabled={busy}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-white">{line.feeKey}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {line.recurrenceLabel} · Y{line.year}
                      {line.semester > 0 ? ` · Sem ${line.semester}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-cyan-200">
                    UGX {line.lineTotalUgx.toLocaleString()}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border-2 border-slate-600/70 bg-slate-900/90 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Installments</p>
        <p className="mt-1 text-xs text-slate-300">
          Pay in full or split into 2–4 installments. Each installment is charged its own transaction / processing fee
          (UGX {quote.platformFeeUgx.toLocaleString()} per payment).
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Installment count">
          {INSTALLMENT_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy}
              onClick={() => onInstallmentCountChange(n)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                installmentCount === n
                  ? "border-cyan-400 bg-cyan-900/40 text-white"
                  : "border-slate-500 bg-slate-800 text-slate-200 hover:border-cyan-400/50"
              }`}
            >
              {n === 1 ? "Pay in full" : `${n} installments`}
            </button>
          ))}
        </div>
        {schedule && payingInstallments ? (
          <ul className="mt-4 space-y-2 border-t border-slate-600/50 pt-3 text-xs">
            {schedule.slices.map((slice) => (
              <li
                key={slice.index}
                className={`flex justify-between gap-2 rounded-lg px-2 py-1.5 ${
                  slice.index === 1 ? "bg-cyan-950/40 text-white" : "text-slate-400"
                }`}
              >
                <span>
                  Installment {slice.index}
                  {slice.index === 1 ? " (due now)" : ""}
                </span>
                <span className="font-mono text-right">
                  UGX {slice.subtotalUgx.toLocaleString()} + fee UGX {slice.platformFeeUgx.toLocaleString()} ={" "}
                  <span className="text-cyan-200">UGX {slice.totalUgx.toLocaleString()}</span>
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-slate-600/50 pt-2 font-semibold text-slate-200">
              <span>Full plan total</span>
              <span className="font-mono">UGX {schedule.fullPlanTotalUgx.toLocaleString()}</span>
            </li>
          </ul>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-600/60 bg-slate-950/50 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/85">Auto calculation</p>
        {payingInstallments && schedule ? (
          <p className="text-xs text-slate-400">
            Showing installment 1 of {schedule.count}. Full fee subtotal UGX{" "}
            {schedule.fullSubtotalUgx.toLocaleString()}.
          </p>
        ) : null}
        <div className="flex justify-between text-slate-300">
          <span>Tuition (selected{payingInstallments ? ", installment 1" : ""})</span>
          <span>UGX {quote.tuitionUgx.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Functional (selected{payingInstallments ? ", installment 1" : ""})</span>
          <span>UGX {quote.functionalFeesUgx.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Subtotal{payingInstallments ? " (installment 1)" : ""}</span>
          <span className="font-mono text-slate-200">UGX {quote.subtotalUgx.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Transaction / processing charge{payingInstallments ? " (this installment)" : ""}</span>
          <span className="font-mono text-slate-200">UGX {quote.platformFeeUgx.toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t border-slate-600 pt-2 text-base font-semibold text-white">
          <span>{payingInstallments ? "Due now (installment 1)" : "Total due"}</span>
          <span>UGX {quote.totalUgx.toLocaleString()}</span>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Estimated to TON</p>
        <p className="mt-2 text-2xl font-bold text-cyan-100">{quote.tonAmount} TON</p>
        <p className="mt-1 text-xs text-slate-400">
          1 TON ≈ UGX {quote.ugxPerTon.toLocaleString()}
          <span className="text-slate-500"> ({formatFxRateSource(quote.rateSource)})</span>
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-600/60 bg-slate-950/50 p-4">
        <label className="text-xs text-slate-400">Full name (required)</label>
        <input
          placeholder="As on your student record"
          value={studentName}
          onChange={(e) => onStudentName(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        />
        <label className="text-xs text-slate-400">Email (required — portal & receipts)</label>
        <input
          type="email"
          required
          placeholder="Same email you will use for student portal"
          value={studentEmail}
          onChange={(e) => onStudentEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        />
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={
          busy ||
          feePool.length === 0 ||
          (!hideGuestIdentity && (!studentName.trim() || !studentEmail.trim()))
        }
        className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
      >
        Continue to payment method
      </button>
    </>
  );
}
