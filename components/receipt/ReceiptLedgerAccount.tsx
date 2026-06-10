"use client";

import type { ReceiptLedger } from "@/lib/receipt-ledger";
import { formatLedgerDateDisplay } from "@/lib/receipt-ledger";

function money(n: number): string {
  if (n <= 0) return "";
  return n.toLocaleString("en-UG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReceiptLedgerAccount({
  ledger,
  variant = "dark",
}: {
  ledger: ReceiptLedger;
  variant?: "dark" | "light";
}) {
  const isDark = variant === "dark";
  const border = isDark ? "border-[var(--border)]" : "border-slate-200";
  const header = isDark ? "text-slate-400" : "text-slate-500";
  const value = isDark ? "text-slate-200" : "text-slate-900";
  const muted = isDark ? "text-slate-500" : "text-slate-600";
  const title = isDark ? "text-white" : "text-slate-900";

  const periodFrom = formatLedgerDateDisplay(ledger.periodFrom);
  const periodTo = formatLedgerDateDisplay(ledger.periodTo);

  return (
    <div className="space-y-4">
      <header className={`text-center ${muted}`}>
        <p className={`text-sm font-semibold uppercase tracking-wide ${title}`}>{ledger.organizationName}</p>
        <p className="mt-1 text-xs">Ledger Account</p>
        <p className="mt-2 text-sm font-medium text-cyan-200/90">{ledger.studentName}</p>
        <p className="mt-1 text-xs">
          {ledger.programmeName} ({ledger.programmeCode})
        </p>
        <p className="mt-1 text-[11px]">
          {periodFrom} to {periodTo}
        </p>
      </header>

      {/* Mobile: card rows */}
      <div className="space-y-2 lg:hidden">
        {ledger.rows.map((row, i) => (
          <article
            key={`${row.kind}-${i}`}
            className={`rounded-lg border ${border} bg-black/20 p-3 text-xs ${value}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {row.date ? (
                  <p className={`font-mono text-[10px] ${muted}`}>{formatLedgerDateDisplay(row.date)}</p>
                ) : null}
                <p className={`mt-0.5 font-medium ${row.kind !== "transaction" ? "italic" : ""}`}>
                  {row.particulars}
                </p>
                {row.vchType ? (
                  <p className={`mt-1 ${muted}`}>
                    {row.vchType}
                    {row.vchNo ? ` · ${row.vchNo}` : ""}
                  </p>
                ) : null}
              </div>
              {row.crDr ? (
                <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">{row.crDr}</span>
              ) : null}
            </div>
            <div className="mt-2 flex justify-end gap-4 font-mono text-[11px]">
              {row.debitUgx > 0 ? <span>Dr {money(row.debitUgx)}</span> : null}
              {row.creditUgx > 0 ? <span>Cr {money(row.creditUgx)}</span> : null}
            </div>
          </article>
        ))}
        <div className={`flex justify-between border-t ${border} pt-2 text-xs font-semibold ${value}`}>
          <span>Totals</span>
          <span className="font-mono">
            Dr {money(ledger.totalDebitUgx)} · Cr {money(ledger.totalCreditUgx)}
          </span>
        </div>
      </div>

      {/* Desktop / tablet landscape: ledger table */}
      <div className={`hidden overflow-x-auto rounded-lg border ${border} lg:block`}>
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className={`border-b ${border} ${header}`}>
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-1 py-2 font-medium">Dr/Cr</th>
              <th className="px-2 py-2 font-medium">Particulars</th>
              <th className="px-2 py-2 font-medium">Vch Type</th>
              <th className="px-2 py-2 font-medium">Vch No</th>
              <th className="px-2 py-2 text-right font-medium">Debit</th>
              <th className="px-2 py-2 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.map((row, i) => (
              <tr key={`${row.kind}-${i}`} className={`border-b ${border} last:border-0 ${value}`}>
                <td className="px-2 py-1.5 font-mono">{formatLedgerDateDisplay(row.date)}</td>
                <td className="px-1 py-1.5 font-mono">{row.crDr}</td>
                <td className={`px-2 py-1.5 ${row.kind !== "transaction" ? "italic" : ""}`}>{row.particulars}</td>
                <td className="px-2 py-1.5">{row.vchType}</td>
                <td className="px-2 py-1.5 font-mono">{row.vchNo}</td>
                <td className="px-2 py-1.5 text-right font-mono">{money(row.debitUgx)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{money(row.creditUgx)}</td>
              </tr>
            ))}
            <tr className={`border-t-2 ${border} font-semibold ${value}`}>
              <td colSpan={5} className="px-2 py-2 text-right">
                Totals
              </td>
              <td className="px-2 py-2 text-right font-mono">{money(ledger.totalDebitUgx)}</td>
              <td className="px-2 py-2 text-right font-mono">{money(ledger.totalCreditUgx)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
