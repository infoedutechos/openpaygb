"use client";

import { useMemo, useState } from "react";
import type { TmaMePayload } from "@/lib/tma-types";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";
import { readJsonResponse } from "@/utils/read-json-response";

type PayMethod = "openpay_card" | "mobile_money" | "ton_wallet";

type FeeQuote =
  | { kind: "semester"; label: string; amountUgx: number }
  | {
      kind: "installment";
      label: string;
      amountUgx: number;
      installmentPlanId: string;
      installmentCount: number;
      installmentIndex: number;
    };

type Props = {
  data: TmaMePayload;
  onSuccess?: (paymentId: string) => void;
};

function fmtUgx(n: number) {
  return `UGX ${n.toLocaleString()}`;
}

/** Snap typed amount to a known checkout quote (±1 UGX), else null. */
function resolveFeeQuote(amountUgx: number, options: FeeQuote[]): FeeQuote | null {
  let best: FeeQuote | null = null;
  let bestDelta = Infinity;
  for (const opt of options) {
    const delta = Math.abs(opt.amountUgx - amountUgx);
    if (delta <= 1 && delta < bestDelta) {
      best = opt;
      bestDelta = delta;
    }
  }
  return best;
}

export function TmaPayFlow({ data, onSuccess }: Props) {
  const student = data.student;
  const b = data.balance;
  const quotes = useMemo((): FeeQuote[] => {
    const list: FeeQuote[] = [];
    if (b?.nextInstallment && b.nextInstallment.amountUgx > 0) {
      list.push({
        kind: "installment",
        label: `Next installment — ${b.nextInstallment.dueLabel}`,
        amountUgx: b.nextInstallment.amountUgx,
        installmentPlanId: b.nextInstallment.installmentPlanId,
        installmentCount: b.nextInstallment.installmentCount,
        installmentIndex: b.nextInstallment.installmentIndex,
      });
      return list;
    }
    // Full-period checkout charges the catalogue total — only when unpaid (not a custom partial).
    if (
      b &&
      !b.partialWithoutInstallment &&
      b.expectedFullPayTotalUgx > 0 &&
      b.outstandingUgx > 0 &&
      Math.abs(b.outstandingUgx - b.expectedFullPayTotalUgx) <= 1
    ) {
      list.push({
        kind: "semester",
        label: "Full period fees",
        amountUgx: b.expectedFullPayTotalUgx,
      });
    }
    return list;
  }, [b]);

  const defaultAmount = String(
    b?.nextInstallment?.amountUgx ?? b?.outstandingUgx ?? 0,
  );
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState<PayMethod>(data.card ? "openpay_card" : "mobile_money");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ paymentId: string; message: string } | null>(null);

  if (!student) return null;

  const amountUgx = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const matched = amountUgx > 0 ? resolveFeeQuote(amountUgx, quotes) : null;

  function checkoutBody() {
    if (!student || !matched) return null;
    const base = {
      organizationSlug: student.organizationSlug,
      studentId: student.id,
      name: student.name,
      email: student.email || undefined,
      programmeCode: student.programmeCode,
      year: student.year,
      semester: student.semester,
      feeSelectionMode: "semester" as const,
    };
    if (matched.kind === "installment") {
      return {
        ...base,
        installmentPlanId: matched.installmentPlanId,
        installmentCount: matched.installmentCount,
        installmentIndex: matched.installmentIndex,
      };
    }
    return base;
  }

  async function handleContinue() {
    if (!student) return;
    setBusy(true);
    setError(null);
    setSuccess(null);

    if (!amountUgx || amountUgx <= 0) {
      setError("Enter a valid amount in UGX");
      setBusy(false);
      return;
    }
    if (!matched) {
      const hints = quotes.map((q) => fmtUgx(q.amountUgx)).join(" or ");
      setError(
        hints
          ? `Amount must match a fee option: ${hints}. Use the quick-select buttons or type that exact amount.`
          : "No fee balance to pay.",
      );
      setBusy(false);
      return;
    }

    const body = checkoutBody();
    if (!body) {
      setBusy(false);
      return;
    }

    try {
      if (method === "openpay_card") {
        const r = await fetch("/api/public/checkout/openpay-card-pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const parsed = await readJsonResponse<{ paymentId?: string; error?: string; message?: string }>(r);
        if (!parsed.ok) throw new Error(parsed.error);
        const paymentId = parsed.data.paymentId ?? "";
        setSuccess({
          paymentId,
          message: parsed.data.message ?? "Payment confirmed from your OpenPayGB card.",
        });
        onSuccess?.(paymentId);
      } else if (method === "mobile_money") {
        if (!phone.trim()) {
          throw new Error("Enter your mobile money number");
        }
        const r = await fetch("/api/public/checkout/livepay-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...body,
            phone: phone.trim(),
          }),
        });
        const parsed = await readJsonResponse<{ paymentId?: string; message?: string; error?: string }>(r);
        if (!parsed.ok) throw new Error(parsed.error);
        setSuccess({
          paymentId: parsed.data.paymentId ?? "",
          message: parsed.data.message ?? "Check your phone to approve the mobile money prompt.",
        });
      } else if (method === "ton_wallet") {
        const payUrl = `/pay/${encodeURIComponent(student.organizationSlug)}`;
        const tg = (window as Window & { Telegram?: { WebApp?: { openLink?: (u: string) => void } } })
          .Telegram?.WebApp;
        const full = `${window.location.origin}${payUrl}`;
        if (tg?.openLink) tg.openLink(full);
        else window.open(payUrl, "_blank");
        setSuccess({ paymentId: "", message: "Opened TON checkout in your browser." });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="tma-card !m-0 space-y-3 text-sm">
        <p className="text-lg font-semibold text-emerald-300">Payment initiated</p>
        <p className="opacity-80">{success.message}</p>
        {success.paymentId ? (
          <p className="font-mono text-xs opacity-60">ID: {success.paymentId.slice(-8)}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="tma-card !m-0 space-y-4 text-sm">
      <div>
        <p className="opacity-60">Institution</p>
        <p className="font-medium">{student.organizationName}</p>
      </div>
      <div>
        <p className="opacity-60">Programme</p>
        <p className="font-medium">{student.programmeCode}</p>
      </div>
      <div>
        <p className="opacity-60">Outstanding</p>
        <p className="text-xl font-semibold">{fmtUgx(b?.outstandingUgx ?? 0)}</p>
      </div>
      {b?.partialWithoutInstallment && quotes.length === 0 ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Partial balance remaining. Use the full web checkout (TON) or ask your school desk — Mini App
          pays full period or installment plan amounts only.
        </p>
      ) : null}
      {quotes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quotes.map((q) => (
            <button
              key={`${q.kind}-${q.amountUgx}`}
              type="button"
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
              onClick={() => setAmount(String(q.amountUgx))}
            >
              {q.kind === "semester" ? "Pay outstanding" : "Pay installment"} · {fmtUgx(q.amountUgx)}
            </button>
          ))}
        </div>
      ) : null}
      <label className="block">
        <span className="opacity-60">Amount (UGX) — must match a fee option above</span>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5"
        />
        {matched ? (
          <p className="mt-1 text-xs text-emerald-300/90">{matched.label}</p>
        ) : amountUgx > 0 ? (
          <p className="mt-1 text-xs text-amber-300/90">Not a valid fee amount for checkout</p>
        ) : null}
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider opacity-60">Payment method</legend>
        {(
          [
            { id: "openpay_card" as const, label: `${OPEN_PAY_BRAND} Card`, disabled: !data.card },
            { id: "mobile_money" as const, label: "Mobile Money", disabled: false },
            { id: "ton_wallet" as const, label: "TON Wallet", disabled: false },
          ] as const
        ).map((m) => (
          <label key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <input
              type="radio"
              name="pay-method"
              checked={method === m.id}
              disabled={m.disabled}
              onChange={() => setMethod(m.id)}
            />
            <span className={m.disabled ? "opacity-40" : ""}>{m.label}</span>
          </label>
        ))}
      </fieldset>
      {method === "mobile_money" ? (
        <label className="block">
          <span className="opacity-60">Mobile money number</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="2567XXXXXXXX"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5"
          />
        </label>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button type="button" className="tma-btn" disabled={busy} onClick={() => void handleContinue()}>
        {busy ? "Processing…" : "Continue"}
      </button>
    </div>
  );
}
