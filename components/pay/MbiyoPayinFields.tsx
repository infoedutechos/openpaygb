"use client";

import { useEffect } from "react";
import {
  MBIYO_COUNTRIES,
  mbiyoCurrencyForCountry,
  mbiyoNetworksForCountry,
} from "@/lib/mbiyo-checkout-form";

type Props = {
  disabled?: boolean;
  countryCode: string;
  setCountryCode: (v: string) => void;
  network: string;
  setNetwork: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  omOtp: string;
  setOmOtp: (v: string) => void;
  /** e.g. "0701234567 or +256701234567" */
  phoneHint?: string;
  /** Guest pay page vs student glass UI */
  tone?: "card" | "glass";
};

export function MbiyoPayinFields({
  disabled,
  countryCode,
  setCountryCode,
  network,
  setNetwork,
  phone,
  setPhone,
  currency,
  setCurrency,
  omOtp,
  setOmOtp,
  phoneHint = "e.g. 701234567 or +221…",
  tone = "card",
}: Props) {
  const nets = mbiyoNetworksForCountry(countryCode);
  const lab = tone === "glass" ? "text-[10px] font-bold uppercase tracking-wider text-slate-500" : "text-xs text-slate-500";
  const field =
    tone === "glass"
      ? "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white"
      : "mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white";
  const hintCls = tone === "glass" ? "mt-1 text-[10px] text-slate-600" : "mt-1 text-[10px] text-slate-600";

  useEffect(() => {
    const list = mbiyoNetworksForCountry(countryCode);
    setNetwork(list[0]!.value);
    setCurrency(mbiyoCurrencyForCountry(countryCode));
  }, [countryCode, setNetwork, setCurrency]);

  return (
    <div className="space-y-3 text-left text-sm">
      <div>
        <label className={lab}>Country</label>
        <select
          disabled={disabled}
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className={field}
        >
          {MBIYO_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={lab}>Mobile wallet network</label>
        <select disabled={disabled} value={network} onChange={(e) => setNetwork(e.target.value)} className={field}>
          {nets.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={lab}>Phone number</label>
        <input
          type="tel"
          disabled={disabled}
          placeholder={phoneHint}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={field}
          autoComplete="tel"
        />
        <p className={hintCls}>Mbiyo rail expects E.164; we normalize from local digits when possible.</p>
        <p className={`${hintCls} text-amber-200/75`}>
          Tuition is quoted in UGX at checkout; Mbiyo converts at pay-in to the settlement currency shown. Uganda is not on
          the Mbiyo network — use TON, LivePay (UG), or choose a listed country/wallet.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={lab}>Currency</label>
          <input
            disabled={disabled}
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className={`${field} font-mono`}
          />
        </div>
        <div>
          <label className={lab}>Operator OTP (optional)</label>
          <input
            disabled={disabled}
            placeholder="If prompted"
            value={omOtp}
            onChange={(e) => setOmOtp(e.target.value)}
            className={field}
          />
        </div>
      </div>
    </div>
  );
}
