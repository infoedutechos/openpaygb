"use client";

import { formatUgx } from "@/components/admin/school/SchoolContextBar";

export function SchoolReportPreview({ reportId, data }: { reportId: string; data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-slate-500">No data.</p>;
  }

  const d = data as Record<string, unknown>;

  if (reportId === "cash-flow") {
    const inflow = (d.inflow as { date: string; name: string; particulars: string; amountUgx: number }[]) ?? [];
    const outflow = (d.outflow as { date: string; name: string; particulars: string; amountUgx: number }[]) ?? [];
    const totals = d.totals as { inflowUgx: number; outflowUgx: number } | undefined;
    return (
      <div className="space-y-4 text-sm">
        <p className="text-slate-300">
          Inflow {formatUgx(totals?.inflowUgx ?? 0)} · Outflow {formatUgx(totals?.outflowUgx ?? 0)}
        </p>
        <ReportTable
          headers={["Date", "Name", "Particulars", "Amount"]}
          rows={[...inflow, ...outflow].map((r) => [
            r.date,
            r.name,
            r.particulars,
            formatUgx(r.amountUgx),
          ])}
        />
      </div>
    );
  }

  if (reportId === "profit-loss") {
    return (
      <ul className="space-y-1 text-sm text-slate-200">
        <li>Income: {formatUgx(Number(d.incomeUgx ?? 0))}</li>
        <li>Expenditure: {formatUgx(Number(d.expenditureUgx ?? 0))}</li>
        <li>Net: {formatUgx(Number(d.netUgx ?? 0))}</li>
        <li>Inventory units: {String(d.inventoryValueUgx ?? 0)}</li>
      </ul>
    );
  }

  if (reportId === "class-bills" || reportId === "bill-account" || reportId === "expense-account" || reportId === "inventory-account" || reportId === "payroll") {
    const rows = (d.rows as Record<string, string | number | null>[]) ?? [];
    if (rows.length === 0) return <p className="text-sm text-slate-500">No rows.</p>;
    const headers = Object.keys(rows[0] ?? {});
    return (
      <ReportTable
        headers={headers}
        rows={rows.map((r) => headers.map((h) => formatCell(r[h])))}
      />
    );
  }

  if (reportId === "student-account") {
    const charges = (d.charges as { accountName: string; amountUgx: number }[]) ?? [];
    const payments = (d.payments as { date: string; amountUgx: number; receiptNo: string }[]) ?? [];
    return (
      <div className="space-y-3 text-sm text-slate-200">
        <p className="font-semibold text-white">{String(d.studentName ?? "Student")}</p>
        <p>Balance: {formatUgx(Number(d.balanceUgx ?? 0))}</p>
        <ReportTable
          headers={["Charge", "Amount"]}
          rows={charges.map((c) => [c.accountName, formatUgx(c.amountUgx)])}
        />
        <ReportTable
          headers={["Date", "Receipt", "Amount"]}
          rows={payments.map((p) => [p.date, p.receiptNo, formatUgx(p.amountUgx)])}
        />
      </div>
    );
  }

  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function formatCell(v: string | number | null | undefined): string {
  if (v == null) return "—";
  if (typeof v === "number" && v > 999) return formatUgx(v);
  return String(v);
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full text-left text-xs text-slate-200">
        <thead className="bg-white/5 uppercase text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2">
                {h.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-white/10">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
