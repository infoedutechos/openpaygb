import type { ReceiptLedger } from "@/lib/receipt-ledger-types";
import { formatLedgerDateDisplay } from "@/lib/receipt-ledger-display";

function money(n: number): string {
  if (n <= 0) return "";
  return n.toLocaleString("en-UG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function receiptLedgerHtml(ledger: ReceiptLedger): string {
  const rows = ledger.rows
    .map(
      (row) => `
    <tr>
      <td style="padding:4px 6px;border:1px solid #ddd;font-family:monospace;font-size:11px">${formatLedgerDateDisplay(row.date)}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;font-size:11px">${row.crDr}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;font-size:11px">${row.particulars}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;font-size:11px">${row.vchType}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;font-family:monospace;font-size:11px">${row.vchNo}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;text-align:right;font-family:monospace;font-size:11px">${money(row.debitUgx)}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;text-align:right;font-family:monospace;font-size:11px">${money(row.creditUgx)}</td>
    </tr>`,
    )
    .join("");

  return `
    <div style="font-family:system-ui,sans-serif;color:#111;max-width:720px">
      <p style="text-align:center;margin:0 0 4px;font-weight:600">${ledger.organizationName}</p>
      <p style="text-align:center;margin:0 0 8px;font-size:12px;color:#555">Ledger Account — ${ledger.studentName}</p>
      <p style="text-align:center;margin:0 0 12px;font-size:11px;color:#666">${ledger.programmeName} (${ledger.programmeCode})</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f4f4f5">
            <th style="padding:6px;border:1px solid #ddd;text-align:left">Date</th>
            <th style="padding:6px;border:1px solid #ddd">Dr/Cr</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left">Particulars</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left">Vch Type</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left">Vch No</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:right">Debit</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:right">Credit</th>
          </tr>
        </thead>
        <tbody>${rows}
          <tr style="font-weight:600;background:#fafafa">
            <td colspan="5" style="padding:6px;border:1px solid #ddd;text-align:right">Totals</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right;font-family:monospace">${money(ledger.totalDebitUgx)}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right;font-family:monospace">${money(ledger.totalCreditUgx)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}
