"use client";

import { useEffect, useState } from "react";

type ReceiptRow = {
  id: string;
  receiptNumber: string;
  status: string;
  amountUgx: number;
  method: string;
  programmeCode: string;
  date: string;
  viewUrl: string;
  pdfUrl: string | null;
};

export function TmaReceipts() {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [selected, setSelected] = useState<ReceiptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/tma/receipts", { credentials: "include" });
        if (!r.ok) throw new Error("Could not load receipts");
        const j = (await r.json()) as { receipts: ReceiptRow[] };
        setRows(j.receipts ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function shareReceipt(row: ReceiptRow) {
    const tg = (window as Window & {
      Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void; openLink?: (u: string) => void } };
    }).Telegram?.WebApp;
    const text = `ODELPay HUB Pay receipt ${row.receiptNumber} — ${row.method} UGX ${row.amountUgx.toLocaleString()}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(row.viewUrl)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else if (tg?.openLink) tg.openLink(shareUrl);
    else if (navigator.share) {
      void navigator.share({ title: row.receiptNumber, text, url: row.viewUrl });
    }
  }

  if (loading) return <p className="p-4 text-sm opacity-70">Loading receipts…</p>;
  if (error) return <p className="p-4 text-sm text-rose-300">{error}</p>;

  if (selected) {
    return (
      <div className="space-y-3 p-4">
        <button type="button" className="text-sm opacity-70" onClick={() => setSelected(null)}>
          ← Back
        </button>
        <div className="tma-card !m-0 space-y-2 text-sm">
          <p className="text-lg font-semibold text-emerald-300">Payment successful</p>
          <p>
            <span className="opacity-60">Receipt</span> #{selected.receiptNumber}
          </p>
          <p>
            <span className="opacity-60">Amount:</span> UGX {selected.amountUgx.toLocaleString()}
          </p>
          <p>
            <span className="opacity-60">Date:</span>{" "}
            {new Date(selected.date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p>
            <span className="opacity-60">Method:</span> {selected.method}
          </p>
          <p>
            <span className="opacity-60">Status:</span> {selected.status}
          </p>
          <div className="grid gap-2 pt-2">
            {selected.pdfUrl ? (
              <a href={selected.pdfUrl} className="tma-btn" target="_blank" rel="noreferrer">
                Download PDF
              </a>
            ) : null}
            <button type="button" className="tma-btn-secondary tma-btn" onClick={() => shareReceipt(selected)}>
              Share
            </button>
            <a href={selected.viewUrl} className="tma-btn-secondary tma-btn text-center" target="_blank" rel="noreferrer">
              Full receipt
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">Receipts & history</h2>
      {rows.length === 0 ? (
        <p className="text-sm opacity-70">No payments yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="tma-card !m-0 w-full text-left text-sm"
                onClick={() => setSelected(row)}
              >
                <p className="font-medium">{row.receiptNumber}</p>
                <p className="opacity-70">
                  UGX {row.amountUgx.toLocaleString()} · {row.method}
                </p>
                <p className="text-xs opacity-50">
                  {new Date(row.date).toLocaleDateString()} · {row.status}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
