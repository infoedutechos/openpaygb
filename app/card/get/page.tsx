"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModalHeader, ModalNextButton } from "@/components/nav/ModalHeader";
import { PageBackLink } from "@/components/nav/PageBackLink";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";
import { readJsonResponse } from "@/utils/read-json-response";

export default function GuestCardGetPage() {
  const params = useSearchParams();
  const defaultSlug = params.get("org") ?? "default";
  const [organizationSlug, setOrganizationSlug] = useState(defaultSlug);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/public/guest-card/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationSlug, name, email, phone }),
      });
      const parsed = await readJsonResponse(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/public/guest-card/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationSlug, email, otp }),
      });
      const parsed = await readJsonResponse<{ card?: { id: string } }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setCardId(parsed.data.card?.id ?? null);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {step === "form" ? (
        <PageBackLink href="/" label="Home" className="mb-4" />
      ) : (
        <div className="mb-4">
          <ModalHeader
            onBack={() => {
              setError(null);
              if (step === "done") setStep("verify");
              else setStep("form");
            }}
            title={step === "verify" ? "Verify email" : "Card reserved"}
            subtitle={
              step === "verify"
                ? `Code sent to ${email}`
                : "Continue to activate your card"
            }
          />
        </div>
      )}

      {step === "form" ? (
        <>
          <h1 className="text-2xl font-semibold text-white">Get your {OPEN_PAY_BRAND} card</h1>
          <p className="mt-2 text-sm text-slate-400">
            Guest registration — verify email, then activate your card with the issue fee.
          </p>
          <form onSubmit={(e) => void sendOtp(e)} className="mt-6 space-y-3">
            <input
              value={organizationSlug}
              onChange={(e) => setOrganizationSlug(e.target.value)}
              placeholder="School slug"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              required
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              required
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              required
            />
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <ModalNextButton type="submit" disabled={busy} label={busy ? "Sending…" : "Send code"} className="w-full" />
          </form>
        </>
      ) : null}

      {step === "verify" ? (
        <form onSubmit={(e) => void verify(e)} className="mt-2 space-y-3">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 tracking-widest"
            inputMode="numeric"
            required
          />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <ModalNextButton
            type="submit"
            disabled={busy}
            label={busy ? "Verifying…" : "Verify & create card"}
            className="w-full"
          />
        </form>
      ) : null}

      {step === "done" ? (
        <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <p className="font-medium text-emerald-200">Card reserved</p>
          <p className="mt-2 text-slate-300">Pay the issue fee to activate, then fund and pay tuition.</p>
          {cardId ? <p className="mt-1 font-mono text-xs text-slate-500">{cardId}</p> : null}
          <Link
            href="/student/card"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Continue to card activation <span aria-hidden>→</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
