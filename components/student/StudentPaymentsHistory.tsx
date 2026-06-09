"use client";

import Link from "next/link";
import { PAYMENT_RAIL_OPENPAY_CARD } from "@/lib/open-pay-brand";

export type StudentPaymentRow = {
  id: string;
  status: string;
  tonAmount: number;
  totalUgx: number;
  txHash: string;
  createdAt: string;
  confirmedAt?: string | null;
  programmeCode: string;
  year: number;
  semester: number;
  rail?: string | null;
};

function formatMoneyUgx(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function railLabel(rail: string): string {
  if (rail === "openpay_card") return PAYMENT_RAIL_OPENPAY_CARD;
  if (rail === "mbiyo") return "Mbiyo";
  if (rail === "livepay") return "LivePay";
  if (rail === "relworx") return "Relworx";
  if (rail === "vixonpay") return "VixonPay";
  if (rail === "web") return "TON";
  if (rail === "telegram") return "Telegram TON";
  return rail;
}

function statusLabel(status: string): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "pending") return "Pending";
  if (status === "refunded") return "Refunded";
  return status;
}

export function StudentPaymentsHistory({
  payments,
  emptyMessage = "No payments yet.",
}: {
  payments: StudentPaymentRow[];
  emptyMessage?: string;
}) {
  if (payments.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-[#0d1526]/80 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-[#0d1526]/80">
      {payments.map((p) => {
        const confirmed = p.status === "confirmed";
        return (
          <li key={p.id} className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">
                  {p.programmeCode} · Year {p.year} · Semester {p.semester}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(p.createdAt)}
                  {p.rail ? ` · ${railLabel(p.rail)}` : ""}
                  {" · "}
                  <span
                    className={
                      confirmed
                        ? "text-emerald-400"
                        : p.status === "pending"
                          ? "text-amber-400"
                          : "text-slate-500"
                    }
                  >
                    {statusLabel(p.status)}
                  </span>
                </p>
                <p className="mt-1 font-mono text-xs text-cyan-200/90">
                  {p.tonAmount > 0 ? `${p.tonAmount} TON` : null}
                  {p.tonAmount > 0 && p.totalUgx > 0 ? " · " : null}
                  {p.totalUgx > 0 ? formatMoneyUgx(p.totalUgx) : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                {confirmed ? (
                  <>
                    <Link
                      href={`/receipt/${p.id}`}
                      className="rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/10"
                    >
                      View receipt
                    </Link>
                    <a
                      href={`/api/receipts/${p.id}/pdf`}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">Receipt when confirmed</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
