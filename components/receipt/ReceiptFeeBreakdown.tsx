import type { InstitutionTier } from "@prisma/client";
import { receiptYearPeriodLabel } from "@/lib/academic-period";
import type { ReceiptBreakdown } from "@/lib/receipt-lines";

function periodHint(
  line: { recurrenceLabel: string; year: number; semester: number },
  institutionTier?: InstitutionTier | string | null,
): string {
  const parts = [line.recurrenceLabel].filter(Boolean);
  const yr = receiptYearPeriodLabel(line.year, line.semester, institutionTier);
  if (yr) parts.push(yr);
  return parts.join(" · ");
}

export function ReceiptFeeBreakdown({
  breakdown,
  variant = "dark",
  institutionTier,
}: {
  breakdown: ReceiptBreakdown;
  variant?: "dark" | "light";
  institutionTier?: InstitutionTier | string | null;
}) {
  const isDark = variant === "dark";
  const labelClass = isDark ? "text-slate-500" : "text-slate-500";
  const valueClass = isDark ? "text-slate-200" : "text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const borderClass = isDark ? "border-[var(--border)]" : "border-slate-200";
  const headerClass = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-3">
      {breakdown.installmentLabel ? (
        <p className={`text-xs font-medium ${isDark ? "text-amber-200/90" : "text-amber-700"}`}>
          {breakdown.installmentLabel}
        </p>
      ) : null}

      <div className={`overflow-x-auto rounded-lg border ${borderClass}`}>
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className={`border-b ${borderClass} text-xs ${headerClass}`}>
              <th className="px-3 py-2 font-medium">Fee line</th>
              <th className="px-3 py-2 text-right font-medium">Tuition</th>
              <th className="px-3 py-2 text-right font-medium">Functional</th>
              <th className="px-3 py-2 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.lines.map((line) => (
              <tr key={line.id} className={`border-b ${borderClass} last:border-0`}>
                <td className="px-3 py-2">
                  <span className={`font-medium ${valueClass}`}>{line.label}</span>
                  {periodHint(line, institutionTier) ? (
                    <span className={`mt-0.5 block text-xs ${mutedClass}`}>{periodHint(line, institutionTier)}</span>
                  ) : null}
                </td>
                <td className={`px-3 py-2 text-right font-mono text-xs ${valueClass}`}>
                  {line.tuitionUgx > 0 ? line.tuitionUgx.toLocaleString() : "—"}
                </td>
                <td className={`px-3 py-2 text-right font-mono text-xs ${valueClass}`}>
                  {line.functionalFeesUgx > 0 ? line.functionalFeesUgx.toLocaleString() : "—"}
                </td>
                <td className={`px-3 py-2 text-right font-mono text-xs font-semibold ${valueClass}`}>
                  {line.lineTotalUgx.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className={`space-y-2 text-sm ${valueClass}`}>
        <div className="flex justify-between gap-4">
          <dt className={labelClass}>Subtotal — tuition</dt>
          <dd className="font-mono">UGX {breakdown.subtotalTuitionUgx.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className={labelClass}>Subtotal — functional</dt>
          <dd className="font-mono">UGX {breakdown.subtotalFunctionalUgx.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className={labelClass}>Fees subtotal</dt>
          <dd className="font-mono">UGX {breakdown.subtotalUgx.toLocaleString()}</dd>
        </div>
        {breakdown.platformFeeUgx > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className={labelClass}>Processing / transaction fee</dt>
            <dd className="font-mono">UGX {breakdown.platformFeeUgx.toLocaleString()}</dd>
          </div>
        ) : null}
        <div className={`flex justify-between gap-4 border-t ${borderClass} pt-2 font-semibold`}>
          <dt className={isDark ? "text-slate-300" : "text-slate-700"}>Total (UGX)</dt>
          <dd className="font-mono">UGX {breakdown.totalUgx.toLocaleString()}</dd>
        </div>
        <div className={`flex justify-between gap-4 ${isDark ? "text-sky-300" : "text-sky-700"}`}>
          <dt>TON paid</dt>
          <dd className="font-mono">{breakdown.tonAmount.toFixed(4)} TON</dd>
        </div>
      </dl>
    </div>
  );
}
