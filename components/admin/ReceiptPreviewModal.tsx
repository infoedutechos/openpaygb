"use client";

import { useCallback, useEffect, useState } from "react";
import { ReceiptFeeBreakdown } from "@/components/receipt/ReceiptFeeBreakdown";
import { ReceiptLetterhead } from "@/components/receipt/ReceiptLetterhead";
import { BrandedQrImage } from "@/components/qr/BrandedQrImage";
import type { ReceiptBreakdown } from "@/lib/receipt-lines";
import type { ReceiptBranding } from "@/lib/receipt-branding-types";

type Receipt = {
  paymentId: string;
  studentName: string;
  programmeCode: string;
  year: number;
  semester: number;
  totalUgx: number;
  tonAmount: number;
  txHash: string;
  issuedAt: string;
  verificationUrl: string;
  feeBreakdown?: ReceiptBreakdown;
  branding?: ReceiptBranding;
  schoolReceiptNo?: string | null;
  displayReceiptNo?: string | null;
};

function programmeShort(code: string): string {
  return (code.split(/[-/]/)[0] ?? code).trim();
}

function formatReceiptNo(paymentId: string, issuedAt: string): string {
  const year = new Date(issuedAt).getFullYear();
  const seq = parseInt(paymentId.slice(-6), 16) % 1_000_000;
  return `ODEL/${year}/${String(seq).padStart(6, "0")}`;
}

function receiptDisplayNo(receipt: Receipt): string {
  const preferred = receipt.displayReceiptNo?.trim() || receipt.schoolReceiptNo?.trim();
  if (preferred) return preferred;
  return formatReceiptNo(receipt.paymentId, receipt.issuedAt);
}

function abbrevTx(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (!t) return "—";
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function formatReceiptDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ReceiptRow({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900" title={title}>
        {value}
      </span>
    </div>
  );
}

export function ReceiptPreviewModal({
  paymentId,
  open,
  onClose,
}: {
  paymentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/receipts/${paymentId}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not load receipt");
      const rec = j.receipt as Receipt;
      setReceipt(rec);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const path = rec.verificationUrl.startsWith("/") ? rec.verificationUrl : `/${rec.verificationUrl}`;
      setVerifyUrl(`${origin}${path}`);
    } catch (e) {
      setReceipt(null);
      setVerifyUrl(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (open && paymentId) void load();
    if (!open) {
      setReceipt(null);
      setVerifyUrl(null);
      setError(null);
    }
  }, [open, paymentId, load]);

  if (!open) return null;

  const periodLabel = receipt?.branding?.periodLabel ?? "Semester";
  const platformName = receipt?.branding?.platform.name ?? "ODEL HUB";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-200/80 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-preview-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close receipt preview"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <div className="px-6 pb-8 pt-10">
          <h2 id="receipt-preview-title" className="sr-only">
            Official Receipt
          </h2>
          {receipt?.branding ? (
            <ReceiptLetterhead platform={receipt.branding.platform} school={receipt.branding.school} />
          ) : (
            <div className="border-b border-slate-200 pb-4 text-center">
              <p className="text-xl font-bold tracking-tight text-slate-900">{platformName}</p>
              <p className="mt-0.5 text-sm text-slate-500">Official Receipt</p>
            </div>
          )}

          <div className="mt-6 space-y-3 text-left">
            {loading && <p className="text-center text-sm text-slate-500">Loading…</p>}
            {error && <p className="text-center text-sm text-rose-600">{error}</p>}
            {receipt && !loading && (
              <>
                <ReceiptRow label="Receipt No" value={receiptDisplayNo(receipt)} />
                <ReceiptRow label="Student" value={receipt.studentName} />
                <ReceiptRow label="Programme" value={programmeShort(receipt.programmeCode)} />
                <ReceiptRow label="Year" value={`YR${receipt.year}`} />
                <ReceiptRow label={periodLabel} value={`${periodLabel} ${receipt.semester}`} />
                {receipt.feeBreakdown ? (
                  <div className="w-full pt-2">
                    <ReceiptFeeBreakdown breakdown={receipt.feeBreakdown} variant="light" />
                  </div>
                ) : (
                  <>
                    <ReceiptRow label="Amount (UGX)" value={receipt.totalUgx.toLocaleString()} />
                    <ReceiptRow label="Amount (TON)" value={receipt.tonAmount.toFixed(4)} />
                  </>
                )}
                <ReceiptRow
                  label="Tx Hash"
                  value={abbrevTx(receipt.txHash)}
                  title={receipt.txHash || undefined}
                />
                <ReceiptRow label="Date" value={formatReceiptDate(receipt.issuedAt)} />
              </>
            )}
          </div>

          {verifyUrl && receipt ? (
            <div className="mt-8 flex flex-col items-center">
              <BrandedQrImage
                payload={verifyUrl}
                alt="Receipt verification QR code with OPGB mark"
                className="h-[140px] w-[140px]"
                size={140}
              />
              <p className="mt-4 text-center text-sm text-slate-600">
                Thank you for choosing {platformName}
                {receipt.branding?.school.name ? ` · ${receipt.branding.school.name}` : ""}
              </p>
            </div>
          ) : null}

          {paymentId && receipt ? (
            <a
              href={`/api/receipts/${paymentId}/pdf`}
              className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Download
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
