import type { ReceiptBreakdown } from "@/lib/receipt-lines";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function periodHint(line: { recurrenceLabel: string; year: number; semester: number }): string {
  const parts = [line.recurrenceLabel].filter(Boolean);
  if (line.semester > 0) parts.push(`Yr ${line.year} · Sem ${line.semester}`);
  else if (line.year > 0) parts.push(`Yr ${line.year}`);
  return parts.join(" · ");
}

/** HTML fee table for Resend receipt emails. */
export function receiptBreakdownHtml(breakdown: ReceiptBreakdown): string {
  const rows = breakdown.lines
    .map((line) => {
      const meta = periodHint(line);
      return `<tr>
  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">
    <strong>${escapeHtml(line.label)}</strong>${meta ? `<br><span style="color:#64748b;font-size:12px;">${escapeHtml(meta)}</span>` : ""}
  </td>
  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${line.tuitionUgx > 0 ? line.tuitionUgx.toLocaleString() : "—"}</td>
  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${line.functionalFeesUgx > 0 ? line.functionalFeesUgx.toLocaleString() : "—"}</td>
  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:600;">${line.lineTotalUgx.toLocaleString()}</td>
</tr>`;
    })
    .join("\n");

  const platformRow =
    breakdown.platformFeeUgx > 0
      ? `<tr><td colspan="3" style="padding:6px 8px;text-align:right;color:#64748b;">Processing / transaction fee</td><td style="padding:6px 8px;text-align:right;font-family:monospace;">${breakdown.platformFeeUgx.toLocaleString()}</td></tr>`
      : "";

  const installment =
    breakdown.installmentLabel
      ? `<p style="margin:0 0 8px;color:#b45309;font-size:13px;"><strong>${escapeHtml(breakdown.installmentLabel)}</strong></p>`
      : "";

  return `${installment}
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
  <thead>
    <tr style="background:#f8fafc;color:#64748b;font-size:12px;">
      <th style="padding:6px 8px;text-align:left;">Fee line</th>
      <th style="padding:6px 8px;text-align:right;">Tuition (UGX)</th>
      <th style="padding:6px 8px;text-align:right;">Functional (UGX)</th>
      <th style="padding:6px 8px;text-align:right;">Line total</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr><td colspan="3" style="padding:8px 8px 4px;text-align:right;color:#64748b;">Fees subtotal</td><td style="padding:8px 8px 4px;text-align:right;font-family:monospace;">${breakdown.subtotalUgx.toLocaleString()}</td></tr>
    ${platformRow}
    <tr><td colspan="3" style="padding:8px 8px 4px;text-align:right;font-weight:700;">Total (UGX)</td><td style="padding:8px 8px 4px;text-align:right;font-family:monospace;font-weight:700;">${breakdown.totalUgx.toLocaleString()}</td></tr>
    <tr><td colspan="3" style="padding:4px 8px;text-align:right;color:#0369a1;font-weight:600;">TON paid</td><td style="padding:4px 8px;text-align:right;font-family:monospace;color:#0369a1;font-weight:600;">${breakdown.tonAmount.toFixed(4)} TON</td></tr>
  </tbody>
</table>`;
}
