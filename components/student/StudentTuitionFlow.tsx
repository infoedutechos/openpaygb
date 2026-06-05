"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { useTonPay } from "@ton-pay/ui-react";
import { PROGRAMME_TRACK_LABEL, ProgrammeTrack } from "@/lib/programme-track";
import { MbiyoPayinFields } from "@/components/pay/MbiyoPayinFields";
import { TuitionCheckoutStepper } from "@/components/pay/TuitionCheckoutStepper";
import { toE164FromNational } from "@/lib/mbiyo-checkout-form";
import {
  OPEN_PAY_BRAND,
  PAYMENT_RAIL_LIVEPAY,
  PAYMENT_RAIL_MBIYO,
  PAYMENT_RAIL_OPENPAY_CARD,
  PAYMENT_RAIL_RELWORX,
  livepayRailSectionLabel,
  mbiyoRailSectionLabel,
  relworxRailSectionLabel,
  openPayBrandLabel,
  openPayCardRailSectionLabel,
  withOpenPayGlobal,
} from "@/lib/open-pay-brand";
import { ugandaPhoneToE164 } from "@/lib/livepay/uganda-phone";
import { formatFxRateSource } from "@/lib/fx-rate-label";
import {
  TuitionBalancePanel,
  type BalanceInstallmentPlan,
  type TuitionBalanceData,
} from "@/components/tuition/TuitionBalancePanel";
import { cancelStudentPayment } from "@/utils/cancel-checkout-payment";
import {
  buildInstallmentSchedule,
  INSTALLMENT_COUNT_OPTIONS,
  type InstallmentCountOption,
  type InstallmentSchedule,
} from "@/lib/installments";
import { ugxToTon } from "@/lib/money";
import { fetchPaymentPublicStatus } from "@/utils/fetch-payment-public";
import { usePaymentStatusPoll } from "@/hooks/usePaymentStatusPoll";

type ProgrammeDuration = {
  durationYears: number;
  semestersPerYear: number;
  totalSemesters: number;
  source: "configured" | "fee_schedule" | "empty";
};

type Programme = {
  id: string;
  code: string;
  name: string;
  track: ProgrammeTrack;
  duration?: ProgrammeDuration;
};

type QuoteLine = {
  id: string;
  feeKey: string;
  recurrence: string;
  recurrenceLabel: string;
  year: number;
  semester: number;
  tuitionUgx: number;
  functionalFeesUgx: number;
  lineTotalUgx: number;
};

type FeeSelectionMode = "semester" | "year" | "programme";

type Quote = {
  programmeCode: string;
  programmeName: string;
  programmeTrack?: string;
  programmeTrackLabel?: string;
  programmeDuration?: ProgrammeDuration;
  year: number;
  semester: number;
  feeSelectionMode: FeeSelectionMode;
  isFullSelection?: boolean;
  poolLineCount?: number;
  poolLines?: QuoteLine[];
  lines: QuoteLine[];
  tuitionUgx: number;
  functionalFeesUgx: number;
  subtotalUgx: number;
  platformFeeUgx: number;
  totalUgx: number;
  ugxPerTon: number;
  rateSource?: string;
  tonAmount: number;
  destinationWallet: string;
  installmentSchedule?: InstallmentSchedule;
};

function normalizeFeeSelectionMode(value: unknown): FeeSelectionMode {
  if (value === "year") return "year";
  if (value === "programme") return "programme";
  return "semester";
}

type MeStudent = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  programmeCode: string;
  year: number;
  semester: number;
  organizationName: string;
  organizationSlug: string;
};

type FlowStep =
  | "landing"
  | "select_programme"
  | "fees_breakdown"
  | "choose_pay_method"
  | "mbiyo_waiting"
  | "connect_wallet"
  | "confirm_payment"
  | "processing"
  | "success";

const defaultYears = [1, 2, 3, 4, 5, 6];
const defaultSemesters = [1, 2, 3];

const CARD_ACCENT = [
  "from-cyan-400/90 to-sky-500/50 shadow-[0_0_24px_rgba(34,211,238,0.35)]",
  "from-violet-500/90 to-fuchsia-600/50 shadow-[0_0_24px_rgba(167,139,250,0.35)]",
  "from-teal-400/90 to-cyan-600/50 shadow-[0_0_24px_rgba(45,212,191,0.35)]",
  "from-indigo-400/90 to-purple-600/50 shadow-[0_0_24px_rgba(129,140,248,0.35)]",
  "from-sky-400/90 to-blue-600/50 shadow-[0_0_24px_rgba(56,189,248,0.35)]",
  "from-fuchsia-400/90 to-pink-600/50 shadow-[0_0_24px_rgba(232,121,249,0.35)]",
];

function abbrevMiddle(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => {});
}

function OhShield() {
  return (
    <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 shadow-[0_0_28px_rgba(34,211,238,0.45)] ring-2 ring-cyan-300/40">
      <span className="text-[11px] font-black tracking-tight text-slate-950">OH</span>
    </span>
  );
}

function CapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="capg" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d="M8 32l16-20 16 20H8z"
        stroke="url(#capg)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="rgba(15,23,42,0.5)"
      />
      <path d="M14 32v6h20v-6" stroke="url(#capg)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-cyan-300/90"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-cyan-200/70" />
    </svg>
  );
}

function TonMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 font-black text-white shadow-[0_0_20px_rgba(34,211,238,0.5)] ${className ?? ""}`}
    >
      T
    </span>
  );
}

function FlowBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-1/4 top-0 h-[50vh] w-[70vw] rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="absolute -right-1/4 top-1/4 h-[45vh] w-[60vw] rounded-full bg-violet-600/12 blur-[90px]" />
      <div className="absolute bottom-0 left-1/3 h-[35vh] w-[80vw] rounded-full bg-indigo-600/10 blur-[80px]" />
    </div>
  );
}

function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function BtnPrimary({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-600 py-3.5 text-sm font-bold uppercase tracking-wide text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.35)] transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:opacity-45"
      {...props}
    >
      {children}
    </button>
  );
}

function BtnGhost({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-cyan-400/35 bg-white/[0.04] py-3.5 text-sm font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:border-cyan-300/60 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

export function StudentTuitionFlow() {
  const [step, setStep] = useState<FlowStep>("landing");
  const [me, setMe] = useState<MeStudent | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [code, setCode] = useState("");
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [feeSelectionMode, setFeeSelectionMode] = useState<FeeSelectionMode>("semester");
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [installmentCount, setInstallmentCount] = useState<InstallmentCountOption>(1);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [walletNote, setWalletNote] = useState<string | null>(null);
  const [paymentMemo, setPaymentMemo] = useState<string | null>(null);
  const [paymentTonAmount, setPaymentTonAmount] = useState<number | null>(null);
  const [chainStatus, setChainStatus] = useState<"pending" | "confirmed">("pending");
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);
  const [payChannel, setPayChannel] = useState<
    "ton" | "mbiyo" | "livepay" | "relworx" | "openpay_card" | null
  >(null);
  const [livepayEnabled, setLivepayEnabled] = useState(false);
  const [relworxEnabled, setRelworxEnabled] = useState(false);
  const [openPayCardPlatformEnabled, setOpenPayCardPlatformEnabled] = useState(false);
  const [openPayCardBalanceUgx, setOpenPayCardBalanceUgx] = useState(0);
  const [openPayCardCanPay, setOpenPayCardCanPay] = useState(false);
  const [useOpenPayCardAtCheckout, setUseOpenPayCardAtCheckout] = useState(false);
  const [livepayPhone, setLivepayPhone] = useState("");
  const [livepayNetwork, setLivepayNetwork] = useState<"mtn" | "airtel">("mtn");
  const [mbiyoCountryCode, setMbiyoCountryCode] = useState("SN");
  const [mbiyoNetwork, setMbiyoNetwork] = useState("orange");
  const [mbiyoPhone, setMbiyoPhone] = useState("");
  const [mbiyoCurrency, setMbiyoCurrency] = useState("XOF");
  const [mbiyoOmOtp, setMbiyoOmOtp] = useState("");
  const [mbiyoRedirectUrl, setMbiyoRedirectUrl] = useState<string | null>(null);
  const [mbiyoInstructions, setMbiyoInstructions] = useState<string | null>(null);
  const [mbiyoAuthMode, setMbiyoAuthMode] = useState<string | null>(null);
  const [mbiyoCollect, setMbiyoCollect] = useState<{ amount: number; currency: string } | null>(null);
  const [balance, setBalance] = useState<TuitionBalanceData | null>(null);
  const wallet = useTonWallet();
  const { pay } = useTonPay();

  const orgSlug = me?.organizationSlug?.trim().toLowerCase() || "default";
  const displayName = me?.organizationName?.trim() || "ODEL HUB";

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/student/me", { credentials: "include" });
      if (r.status === 401) {
        setLoadErr("signed-out");
        return;
      }
      const j = (await r.json()) as { student?: MeStudent };
      if (!j.student) {
        setLoadErr("no-student");
        return;
      }
      setMe(j.student);
      setCode(j.student.programmeCode || "");
      setYear(j.student.year || 1);
      setSemester(j.student.semester || 1);
    })();
  }, []);

  useEffect(() => {
    void fetch("/api/student/openpay-card", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (j: {
          platform?: { enabled?: boolean };
          card?: { status?: string; balanceUgx?: number };
          canPayTuition?: boolean;
        } | null) => {
          if (!j) return;
          setOpenPayCardPlatformEnabled(Boolean(j.platform?.enabled));
          setOpenPayCardCanPay(Boolean(j.canPayTuition && j.card?.status === "active"));
          setOpenPayCardBalanceUgx(j.card?.balanceUgx ?? 0);
        },
      )
      .catch(() => {
        setOpenPayCardPlatformEnabled(false);
        setOpenPayCardCanPay(false);
      });
  }, []);

  useEffect(() => {
    void fetch("/api/public/livepay-config")
      .then((r) => r.json())
      .then((j: { enabled?: boolean }) => setLivepayEnabled(Boolean(j.enabled)))
      .catch(() => setLivepayEnabled(false));
    void fetch("/api/public/relworx-config")
      .then((r) => r.json())
      .then((j: { enabled?: boolean }) => setRelworxEnabled(Boolean(j.enabled)))
      .catch(() => setRelworxEnabled(false));
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    void (async () => {
      const r = await fetch("/api/student/balance", { credentials: "include" });
      if (!r.ok) return;
      const j = (await r.json()) as { balance?: TuitionBalanceData | null };
      if (j.balance) setBalance(j.balance);
    })();
  }, [me?.id]);

  useEffect(() => {
    if (!me) return;
    const q = new URLSearchParams();
    q.set("orgSlug", orgSlug);
    fetch(`/api/programmes?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.programmes && d.error) {
          setError(d.error);
          return;
        }
        setProgrammes(
          (d.programmes ?? []).map((p: Programme & { track?: string }) => ({
            ...p,
            track: p.track === ProgrammeTrack.inservice ? ProgrammeTrack.inservice : ProgrammeTrack.regular,
          }))
        );
      })
      .catch(() => setError("Could not load programmes"));
  }, [me, orgSlug]);

  useEffect(() => {
    if (!me?.phone?.trim()) return;
    setMbiyoPhone((prev) => (prev.trim() ? prev : me.phone!.trim()));
  }, [me?.id, me?.phone]);

  useEffect(() => {
    if (!programmes.length) return;
    if (!programmes.some((p) => p.code === code)) {
      setCode(programmes[0].code);
    }
  }, [programmes, code]);

  const { inserviceRows, regularRows } = useMemo(() => {
    const inserviceRows: Programme[] = [];
    const regularRows: Programme[] = [];
    for (const p of programmes) {
      if (p.track === ProgrammeTrack.inservice) inserviceRows.push(p);
      else regularRows.push(p);
    }
    return { inserviceRows, regularRows };
  }, [programmes]);

  const applyPaymentStatus = useCallback(
    (payment: { status: string; memo?: string | null; txHash?: string }) => {
      if (payment.status !== "confirmed") return;
      setChainStatus("confirmed");
      if (typeof payment.memo === "string") setPaymentMemo(payment.memo);
      if (typeof payment.txHash === "string" && payment.txHash.trim()) {
        setConfirmedTxHash(payment.txHash.trim());
      }
    },
    [],
  );

  const handlePollInvalid = useCallback((status: 400 | 404) => {
    setPaymentId(null);
    setPaymentMemo(null);
    setPaymentTonAmount(null);
    setChainStatus("pending");
    setConfirmedTxHash(null);
    setWalletNote(null);
    setError(
      status === 400
        ? "Invalid payment reference. Go back to fees and create a new payment."
        : "This payment no longer exists (for example after a database reset). Go back to fees and create a new payment.",
    );
    setStep((prev) =>
      prev === "choose_pay_method" ||
      prev === "mbiyo_waiting" ||
      prev === "connect_wallet" ||
      prev === "confirm_payment" ||
      prev === "processing" ||
      prev === "success"
        ? "fees_breakdown"
        : prev,
    );
  }, []);

  usePaymentStatusPoll({
    paymentId,
    step,
    chainStatus,
    onUpdate: applyPaymentStatus,
    onInvalid: handlePollInvalid,
    onRateLimited: () => {
      setWalletNote((prev) =>
        prev?.includes("slowed down")
          ? prev
          : "Status checks were slowed down to avoid rate limits. This page will keep trying.",
      );
    },
  });

  const pollPaymentOnce = useCallback(async () => {
    if (!paymentId) return;
    const result = await fetchPaymentPublicStatus(paymentId);
    if (result.ok) applyPaymentStatus(result.payment);
    else if (result.status === 400 || result.status === 404) handlePollInvalid(result.status);
  }, [paymentId, applyPaymentStatus, handlePollInvalid]);

  useEffect(() => {
    if (chainStatus !== "confirmed" || !paymentId) return;
    if (step === "success") return;
    if (
      step === "landing" ||
      step === "select_programme" ||
      step === "fees_breakdown" ||
      step === "choose_pay_method"
    )
      return;
    setStep("success");
  }, [chainStatus, paymentId, step]);

  useEffect(() => {
    const needsQuote: FlowStep[] = [
      "fees_breakdown",
      "choose_pay_method",
      "connect_wallet",
      "confirm_payment",
      "processing",
      "mbiyo_waiting",
      "success",
    ];
    if (needsQuote.includes(step) && !quote) {
      setStep("select_programme");
      setError((prev) => prev ?? "Pick programme and fees to continue.");
      return;
    }
    const needsPayment: FlowStep[] = [
      "connect_wallet",
      "confirm_payment",
      "processing",
      "mbiyo_waiting",
      "success",
    ];
    if (needsPayment.includes(step) && !paymentId) {
      setStep(quote ? "choose_pay_method" : "select_programme");
      setError((prev) => prev ?? "Choose a payment method to continue.");
    }
  }, [step, quote, paymentId]);

  const tonDisplay = paymentTonAmount ?? quote?.tonAmount ?? 0;

  const selectedProgramme = useMemo(() => programmes.find((p) => p.code === code), [programmes, code]);
  const yearOptions = useMemo(() => {
    const count = selectedProgramme?.duration?.durationYears ?? 0;
    return count > 0 ? Array.from({ length: count }, (_, i) => i + 1) : defaultYears;
  }, [selectedProgramme?.duration?.durationYears]);
  const semesterOptions = useMemo(() => {
    const count = selectedProgramme?.duration?.semestersPerYear ?? 0;
    return count > 0 ? Array.from({ length: count }, (_, i) => i + 1) : defaultSemesters;
  }, [selectedProgramme?.duration?.semestersPerYear]);

  useEffect(() => {
    if (!selectedProgramme) return;
    if (!yearOptions.includes(year)) setYear(yearOptions[0] ?? 1);
    if (!semesterOptions.includes(semester)) setSemester(semesterOptions[0] ?? 1);
  }, [selectedProgramme, yearOptions, semesterOptions, year, semester]);

  function quoteUrl(mode: FeeSelectionMode, feeIds: string[] | null, qCode: string) {
    const qs = new URLSearchParams();
    qs.set("year", String(year));
    qs.set("semester", String(semester));
    qs.set("orgSlug", orgSlug);
    qs.set("feeSelectionMode", mode);
    if (feeIds && feeIds.length > 0) {
      qs.set("feeIds", [...feeIds].sort().join(","));
    }
    return `/api/programmes/${encodeURIComponent(qCode)}/quote?${qs.toString()}`;
  }

  function quoteWithInstallments(j: Quote, payInstallments: InstallmentCountOption): Quote {
    const subtotalUgx =
      typeof j.subtotalUgx === "number" ? j.subtotalUgx : j.tuitionUgx + j.functionalFeesUgx;
    const platformFeeUgx = typeof j.platformFeeUgx === "number" ? j.platformFeeUgx : 0;
    const schedule = buildInstallmentSchedule(subtotalUgx, platformFeeUgx, payInstallments);
    const firstSlice = schedule.slices[0];
    const instSubtotal = firstSlice?.subtotalUgx ?? subtotalUgx;
    const ratio = subtotalUgx > 0 ? instSubtotal / subtotalUgx : 1;
    const instTuition = Math.round(j.tuitionUgx * ratio);
    const instFunctional = instSubtotal - instTuition;
    return {
      ...j,
      tuitionUgx: instTuition,
      functionalFeesUgx: instFunctional,
      subtotalUgx: instSubtotal,
      platformFeeUgx,
      totalUgx: firstSlice?.totalUgx ?? j.totalUgx,
      tonAmount:
        typeof j.ugxPerTon === "number" && j.ugxPerTon > 0
          ? ugxToTon(firstSlice?.totalUgx ?? j.totalUgx, j.ugxPerTon)
          : j.tonAmount,
      installmentSchedule: schedule,
    };
  }

  async function loadQuote(opts?: {
    mode?: FeeSelectionMode;
    feeIds?: string[];
    useFullPool?: boolean;
    installmentCount?: InstallmentCountOption;
  }): Promise<boolean> {
    const mode = opts?.mode ?? feeSelectionMode;
    const payInstallments = opts?.installmentCount ?? installmentCount;
    setError(null);
    setBusy(true);
    try {
      let feeIdsParam: string[] | null = null;
      if (opts?.useFullPool) {
        feeIdsParam = null;
      } else if (opts?.feeIds !== undefined) {
        if (opts.feeIds.length === 0) {
          setError("Pick at least one fee item.");
          return false;
        }
        feeIdsParam = opts.feeIds;
      } else if (selectedFeeIds.length > 0 && quote) {
        const poolSrc = quote.poolLines?.length ? quote.poolLines : quote.lines;
        const poolIds = new Set(poolSrc.map((l) => l.id));
        const allPicked =
          selectedFeeIds.length === poolIds.size && selectedFeeIds.every((id) => poolIds.has(id));
        feeIdsParam = allPicked ? null : [...selectedFeeIds];
      }
      const r = await fetch(quoteUrl(mode, feeIdsParam, code));
      const j = (await r.json()) as Quote & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Quote failed");
      const lines = Array.isArray(j.lines) ? j.lines : [];
      const poolLines =
        Array.isArray(j.poolLines) && j.poolLines.length > 0 ? j.poolLines : lines;
      const base: Quote = {
        ...j,
        lines,
        poolLines,
        feeSelectionMode: normalizeFeeSelectionMode(j.feeSelectionMode),
        subtotalUgx: typeof j.subtotalUgx === "number" ? j.subtotalUgx : j.tuitionUgx + j.functionalFeesUgx,
        platformFeeUgx: typeof j.platformFeeUgx === "number" ? j.platformFeeUgx : 0,
        isFullSelection: Boolean(j.isFullSelection),
        poolLineCount: typeof j.poolLineCount === "number" ? j.poolLineCount : poolLines.length,
      };
      const next = quoteWithInstallments(base, payInstallments);
      setFeeSelectionMode(next.feeSelectionMode);
      setInstallmentCount(payInstallments);
      setQuote(next);
      setSelectedFeeIds(lines.map((l) => l.id));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed");
      setQuote(null);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onContinueFromProgramme() {
    setFeeSelectionMode("semester");
    setSelectedFeeIds([]);
    setQuote(null);
    const ok = await loadQuote({ mode: "semester", useFullPool: true });
    if (ok) setStep("fees_breakdown");
  }

  function toggleFeeLine(id: string) {
    if (!quote) return;
    const poolSrc = quote.poolLines?.length ? quote.poolLines : quote.lines;
    const poolIds = poolSrc.map((l) => l.id);
    const set = new Set(selectedFeeIds.length > 0 ? selectedFeeIds : poolIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = [...set];
    if (next.length === 0) {
      setError("Pick at least one fee item.");
      return;
    }
    void loadQuote({ mode: quote.feeSelectionMode, feeIds: next, installmentCount });
  }

  function selectAllFeeLines() {
    if (!quote) return;
    void loadQuote({ mode: quote.feeSelectionMode, useFullPool: true, installmentCount });
  }

  async function setCoverageMode(mode: FeeSelectionMode) {
    setSelectedFeeIds([]);
    await loadQuote({ mode, useFullPool: true, installmentCount });
  }

  async function onInstallmentCountChange(count: InstallmentCountOption) {
    setInstallmentCount(count);
    if (!quote) return;
    const poolSrc = quote.poolLines?.length ? quote.poolLines : quote.lines;
    const poolIds = poolSrc.map((l) => l.id);
    const allSelected =
      selectedFeeIds.length === poolIds.length && selectedFeeIds.every((id) => poolIds.includes(id));
    await loadQuote({
      mode: quote.feeSelectionMode,
      installmentCount: count,
      ...(allSelected ? { useFullPool: true } : { feeIds: selectedFeeIds }),
    });
  }

  async function cancelCurrentPendingPayment() {
    if (!paymentId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await cancelStudentPayment(paymentId);
      if (!r.ok) throw new Error(r.error ?? "Could not cancel");
      setPaymentId(null);
      setPaymentMemo(null);
      setPaymentTonAmount(null);
      setPayChannel(null);
      setStep("landing");
      const br = await fetch("/api/student/balance", { credentials: "include" });
      if (br.ok) {
        const bj = (await br.json()) as { balance?: TuitionBalanceData | null };
        setBalance(bj.balance ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel payment");
    } finally {
      setBusy(false);
    }
  }

  async function payResumeInstallment(plan: BalanceInstallmentPlan, channel: "ton" | "mbiyo") {
    if (!me || !plan.nextDueIndex) return;
    setError(null);
    setBusy(true);
    try {
      setCode(plan.programmeCode);
      setYear(plan.year);
      setSemester(plan.semester);
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: me.id,
        programmeCode: plan.programmeCode,
        year: plan.year,
        semester: plan.semester,
        installmentPlanId: plan.installmentPlanId,
        installmentIndex: plan.nextDueIndex,
        feeSelectionMode: plan.feeSelectionMode,
      };
      if (channel === "ton") {
        body.rail = "web";
        const rp = await fetch("/api/public/checkout/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const pj = await rp.json();
        if (!rp.ok) throw new Error(pj.error ?? "Payment create failed");
        setPayChannel("ton");
        setPaymentId(pj.payment.id);
        setPaymentMemo(pj.payment.memo ?? null);
        setPaymentTonAmount(typeof pj.payment.tonAmount === "number" ? pj.payment.tonAmount : null);
        setChainStatus("pending");
        setConfirmedTxHash(null);
        setWalletNote(null);
        setStep("connect_wallet");
        return;
      }
      const phone = toE164FromNational(mbiyoPhone.trim(), mbiyoCountryCode);
      if (!phone) {
        setError("Enter a valid mobile number for mobile money.");
        setStep("choose_pay_method");
        return;
      }
      body.phone = phone;
      body.countryCode = mbiyoCountryCode;
      body.network = mbiyoNetwork;
      body.currency = (mbiyoCurrency || "UGX").slice(0, 3).toUpperCase();
      if (mbiyoOmOtp.trim()) body.omOtp = mbiyoOmOtp.trim();
      const r = await fetch("/api/public/checkout/mbiyo-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        payment?: { id: string; memo?: string | null };
        mbiyo?: {
          collectAmount?: number;
          currency?: string | null;
          redirectUrl?: string | null;
          instructions?: string | null;
          authMode?: string | null;
        };
      };
      if (!r.ok) throw new Error(j.error ?? `Could not start ${PAYMENT_RAIL_MBIYO} payment`);
      if (!j.payment?.id) throw new Error(`Invalid ${PAYMENT_RAIL_MBIYO} response`);
      setPayChannel("mbiyo");
      setPaymentId(j.payment.id);
      setPaymentMemo(j.payment.memo ?? null);
      setMbiyoRedirectUrl(j.mbiyo?.redirectUrl ?? null);
      setMbiyoInstructions(j.mbiyo?.instructions ?? null);
      setMbiyoAuthMode(j.mbiyo?.authMode ?? null);
      if (typeof j.mbiyo?.collectAmount === "number" && j.mbiyo.currency) {
        setMbiyoCollect({ amount: j.mbiyo.collectAmount, currency: j.mbiyo.currency });
      }
      setStep("mbiyo_waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start installment payment");
    } finally {
      setBusy(false);
    }
  }

  async function payTuitionWithOpenPayCard() {
    if (!me || !quote) return;
    if (!openPayCardCanPay || openPayCardBalanceUgx < quote.totalUgx) {
      setError("Insufficient OpenPayGB card balance. Top up your card on the student home page.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: me.id,
        programmeCode: code,
        year,
        semester,
        feeSelectionMode: quote.feeSelectionMode,
        installmentCount,
      };
      if (quote.isFullSelection !== true && quote.lines.length > 0) {
        body.feeIds = [...quote.lines.map((l) => l.id)].sort();
      }
      const rp = await fetch("/api/public/checkout/openpay-card-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const pj = await rp.json();
      if (!rp.ok) throw new Error(pj.error ?? "OpenPayGB card payment failed");
      setPayChannel("openpay_card");
      setPaymentId(pj.payment.id);
      setChainStatus("confirmed");
      setOpenPayCardBalanceUgx(pj.openPayCard?.balanceUgx ?? 0);
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pay with OpenPayGB card");
    } finally {
      setBusy(false);
    }
  }

  /** Logged-in student: pending TON (web rail) payment, then wallet send. */
  async function createTonPaymentForStudent() {
    if (!me) return;
    setError(null);
    setBusy(true);
    try {
      if (!quote) throw new Error("Load quote first");
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: me.id,
        programmeCode: code,
        year,
        semester,
        rail: "web",
        feeSelectionMode: quote.feeSelectionMode,
        installmentCount,
      };
      if (quote.isFullSelection !== true && quote.lines.length > 0) {
        body.feeIds = [...quote.lines.map((l) => l.id)].sort();
      }
      const rp = await fetch("/api/public/checkout/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const pj = await rp.json();
      if (!rp.ok) throw new Error(pj.error ?? "Payment create failed");
      setPayChannel("ton");
      setPaymentId(pj.payment.id);
      setPaymentMemo(pj.payment.memo ?? null);
      setPaymentTonAmount(typeof pj.payment.tonAmount === "number" ? pj.payment.tonAmount : null);
      setChainStatus("pending");
      setConfirmedTxHash(null);
      setWalletNote(null);
      setMbiyoRedirectUrl(null);
      setMbiyoInstructions(null);
      setMbiyoAuthMode(null);
      setMbiyoCollect(null);
      setStep("connect_wallet");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setBusy(false);
    }
  }

  async function startStudentMbiyo() {
    if (!me) return;
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    const phone = toE164FromNational(mbiyoPhone.trim(), mbiyoCountryCode);
    if (!phone) {
      setError("Enter a valid mobile number (local 0… or full +country code).");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: me.id,
        programmeCode: code,
        year,
        semester,
        phone,
        countryCode: mbiyoCountryCode,
        network: mbiyoNetwork,
        currency: (mbiyoCurrency || "UGX").slice(0, 3).toUpperCase(),
        feeSelectionMode: quote.feeSelectionMode,
        installmentCount,
      };
      if (mbiyoOmOtp.trim()) body.omOtp = mbiyoOmOtp.trim();
      if (quote.isFullSelection !== true && quote.lines.length > 0) {
        body.feeIds = [...quote.lines.map((l) => l.id)].sort();
      }
      const r = await fetch("/api/public/checkout/mbiyo-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        payment?: { id: string; memo?: string | null };
        mbiyo?: {
          collectAmount?: number;
          currency?: string | null;
          redirectUrl?: string | null;
          instructions?: string | null;
          authMode?: string | null;
        };
      };
      if (!r.ok) throw new Error(j.error ?? `Could not start ${PAYMENT_RAIL_MBIYO} payment`);
      if (!j.payment?.id) throw new Error(`Invalid ${PAYMENT_RAIL_MBIYO} response`);
      setPayChannel("mbiyo");
      setPaymentId(j.payment.id);
      setPaymentMemo(j.payment.memo ?? null);
      setPaymentTonAmount(null);
      setChainStatus("pending");
      setConfirmedTxHash(null);
      setWalletNote(null);
      setMbiyoRedirectUrl(j.mbiyo?.redirectUrl?.trim() ? j.mbiyo.redirectUrl : null);
      setMbiyoInstructions(typeof j.mbiyo?.instructions === "string" ? j.mbiyo.instructions : null);
      setMbiyoAuthMode(typeof j.mbiyo?.authMode === "string" ? j.mbiyo.authMode : null);
      setMbiyoCollect(
        typeof j.mbiyo?.collectAmount === "number" && typeof j.mbiyo.currency === "string" && j.mbiyo.currency.trim()
          ? { amount: j.mbiyo.collectAmount, currency: j.mbiyo.currency.trim().toUpperCase() }
          : null,
      );
      setStep("mbiyo_waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not start ${PAYMENT_RAIL_MBIYO} payment`);
    } finally {
      setBusy(false);
    }
  }

  async function startStudentRelworx() {
    if (!me) return;
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    const phone = ugandaPhoneToE164(livepayPhone.trim());
    if (!phone) {
      setError("Enter a valid Uganda mobile number (e.g. 0777123456).");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: me.id,
        programmeCode: code,
        year,
        semester,
        phone,
        feeSelectionMode: quote.feeSelectionMode,
        installmentCount,
      };
      if (quote.isFullSelection !== true && quote.lines.length > 0) {
        body.feeIds = [...quote.lines.map((l) => l.id)].sort();
      }
      const r = await fetch("/api/public/checkout/relworx-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        payment?: { id: string; memo?: string | null };
        relworx?: { message?: string };
      };
      if (!r.ok) throw new Error(j.error ?? `Could not start ${PAYMENT_RAIL_RELWORX} payment`);
      if (!j.payment?.id) throw new Error(`Invalid ${PAYMENT_RAIL_RELWORX} response`);
      setPayChannel("relworx");
      setPaymentId(j.payment.id);
      setPaymentMemo(j.payment.memo ?? null);
      setPaymentTonAmount(null);
      setChainStatus("pending");
      setConfirmedTxHash(null);
      setWalletNote(j.relworx?.message ?? "Approve the mobile money prompt on your phone.");
      setMbiyoRedirectUrl(null);
      setMbiyoInstructions(null);
      setMbiyoAuthMode(null);
      setMbiyoCollect({ amount: quote.totalUgx, currency: "UGX" });
      setStep("mbiyo_waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not start ${PAYMENT_RAIL_RELWORX} payment`);
    } finally {
      setBusy(false);
    }
  }

  async function startStudentLivepay() {
    if (!me) return;
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    const phone = ugandaPhoneToE164(livepayPhone.trim());
    if (!phone) {
      setError("Enter a valid Uganda mobile number (e.g. 0777123456).");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: me.id,
        programmeCode: code,
        year,
        semester,
        phone,
        network: livepayNetwork,
        feeSelectionMode: quote.feeSelectionMode,
        installmentCount,
      };
      if (quote.isFullSelection !== true && quote.lines.length > 0) {
        body.feeIds = [...quote.lines.map((l) => l.id)].sort();
      }
      const r = await fetch("/api/public/checkout/livepay-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        payment?: { id: string; memo?: string | null };
        livepay?: { message?: string };
      };
      if (!r.ok) throw new Error(j.error ?? `Could not start ${PAYMENT_RAIL_LIVEPAY} payment`);
      if (!j.payment?.id) throw new Error(`Invalid ${PAYMENT_RAIL_LIVEPAY} response`);
      setPayChannel("livepay");
      setPaymentId(j.payment.id);
      setPaymentMemo(j.payment.memo ?? null);
      setPaymentTonAmount(null);
      setChainStatus("pending");
      setConfirmedTxHash(null);
      setWalletNote(j.livepay?.message ?? "Approve the MTN/Airtel prompt on your phone.");
      setMbiyoRedirectUrl(null);
      setMbiyoInstructions(null);
      setMbiyoAuthMode(null);
      setMbiyoCollect({ amount: quote.totalUgx, currency: "UGX" });
      setStep("mbiyo_waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not start ${PAYMENT_RAIL_LIVEPAY} payment`);
    } finally {
      setBusy(false);
    }
  }

  async function sendTonWithWallet() {
    if (!quote || !paymentId) return;
    if (!wallet?.account?.address?.trim()) {
      setWalletNote("Connect your TON wallet first.");
      setStep("connect_wallet");
      return;
    }
    const memo = paymentMemo?.trim();
    if (!memo) {
      setWalletNote("Payment note is missing. Go back one step and continue again.");
      return;
    }
    setError(null);
    setWalletNote(null);
    setBusy(true);
    try {
      await pay(async (senderAddr: string) => {
        const r = await fetch("/api/public/checkout/ton-pay-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, senderAddr }),
        });
        const j = (await r.json()) as {
          error?: string;
          message?: { address: string; amount: string; payload: string };
          reference?: string;
        };
        if (!r.ok) throw new Error(j.error ?? "Could not prepare transfer");
        if (!j.message || !j.reference) throw new Error("Invalid transfer response");
        return { message: j.message, reference: j.reference };
      });
      setStep("processing");
      void pollPaymentOnce();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet action cancelled or failed.";
      setWalletNote(msg);
    } finally {
      setBusy(false);
    }
  }

  function resetFlow() {
    setStep("landing");
    setQuote(null);
    setFeeSelectionMode("semester");
    setSelectedFeeIds([]);
    setPaymentId(null);
    setPaymentMemo(null);
    setPaymentTonAmount(null);
    setChainStatus("pending");
    setConfirmedTxHash(null);
    setWalletNote(null);
    setError(null);
    setPayChannel(null);
    setMbiyoCountryCode("SN");
    setMbiyoNetwork("orange");
    setMbiyoPhone(me?.phone?.trim() ?? "");
    setMbiyoCurrency("XOF");
    setMbiyoOmOtp("");
    setMbiyoRedirectUrl(null);
    setMbiyoInstructions(null);
    setMbiyoAuthMode(null);
    setMbiyoCollect(null);
  }

  if (loadErr === "signed-out") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-300">
        <p className="text-rose-400">Sign in to continue.</p>
        <Link href="/student/login?next=/student/pay" className="mt-4 inline-block text-cyan-400 underline">
          Student login
        </Link>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm uppercase tracking-widest text-cyan-200/60">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-[calc(100dvh-5.5rem)] max-w-md px-4 pb-28 pt-4 text-slate-100">
      <FlowBackdrop />

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          {error}
        </p>
      ) : null}

      <TuitionCheckoutStepper step={step} payChannel={payChannel} />

      {step === "landing" && (
        <div className="space-y-8 text-center">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OhShield />
              <span className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200/90">ODEL HUB</span>
                <span className="text-xs font-semibold text-slate-400">{displayName}</span>
              </span>
            </div>
            <Link href="/student" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-cyan-200">
              Dashboard
            </Link>
          </header>

          <GlassPanel className="overflow-hidden p-0">
            <div className="relative px-5 pb-8 pt-10">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/15 via-transparent to-violet-600/10" />
              <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center sm:h-40 sm:w-40">
                <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-br from-cyan-400/30 to-violet-600/20 blur-2xl" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl sm:h-36 sm:w-36 border border-cyan-400/40 bg-slate-950/80 shadow-[0_0_40px_rgba(34,211,238,0.25)]">
                  <TonMark className="h-12 w-12 text-lg sm:h-16 sm:w-16" />
                </div>
              </div>
              <h1 className="relative text-xl font-black uppercase leading-tight tracking-[0.12em] text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.35)] md:text-2xl">
                Tuition Waiver Program
              </h1>
              <p className="relative mt-4 text-sm leading-relaxed text-slate-400">
                Pay with <span className="text-cyan-300">TON</span> on-chain or{" "}
                <span className="text-cyan-300">{openPayBrandLabel}</span>{" "}
                mobile money (UGX) at the same quoted totals.
              </p>
            </div>
          </GlassPanel>

          {balance ? (
            <TuitionBalancePanel
              balance={balance}
              busy={busy}
              onPayInstallment={(plan) => void payResumeInstallment(plan, "ton")}
            />
          ) : null}

          <div className="flex flex-col gap-3">
            <BtnPrimary onClick={() => setStep("select_programme")}>Get started</BtnPrimary>
            <BtnGhost onClick={() => document.getElementById("stu-how")?.scrollIntoView({ behavior: "smooth" })}>
              How it works
            </BtnGhost>
          </div>

          <section id="stu-how" className="text-left">
            <GlassPanel className="p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/90">How it works</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-400">
                <li>
                  <strong className="text-slate-300">Programme</strong> — year, semester, and code.
                </li>
                <li>
                  <strong className="text-slate-300">Fees</strong> — coverage, fee lines, UGX total.
                </li>
                <li>
                  <strong className="text-slate-300">Method</strong> — {withOpenPayGlobal("TON")}.
                </li>
                <li>
                  <strong className="text-slate-300">Pay</strong> — wallet or phone approval.
                </li>
                <li>
                  <strong className="text-slate-300">Done</strong> — receipt download.
                </li>
              </ol>
            </GlassPanel>
          </section>

          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-600">
            {withOpenPayGlobal("TON")} checkout
          </p>
          <div className="flex justify-center gap-1.5 pb-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-cyan-400 shadow-[0_0_8px_cyan]" : "bg-slate-700"}`} />
            ))}
          </div>
        </div>
      )}

      {step === "select_programme" && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep("landing")}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-cyan-200"
          >
            <span aria-hidden>←</span> Back
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">Select programme</h1>
            <p className="mt-2 text-sm text-slate-500">Choose your program to continue</p>
          </div>
          {programmes.length === 0 ? (
            <p className="text-sm text-amber-300">No programmes found. Ask your school admin or run seed data.</p>
          ) : (
            <>
              <div className="space-y-8">
                {(
                  [
                    { tr: ProgrammeTrack.inservice, rows: inserviceRows },
                    { tr: ProgrammeTrack.regular, rows: regularRows },
                  ] as const
                ).map((section, si) => (
                  <div key={section.tr} className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">
                      {PROGRAMME_TRACK_LABEL[section.tr]}
                    </h2>
                    {section.rows.length === 0 ? (
                      <p className="text-xs text-slate-600">No programmes in this track.</p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list">
                        {section.rows.map((p, i) => {
                          const flatI = si === 0 ? i : inserviceRows.length + i;
                          const selected = code === p.code;
                          const grad = CARD_ACCENT[flatI % CARD_ACCENT.length];
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setCode(p.code);
                                  setQuote(null);
                                  setSelectedFeeIds([]);
                                }}
                                aria-pressed={selected}
                                className={`relative flex min-h-[9rem] w-full flex-col rounded-2xl border p-4 text-left transition-all sm:min-h-[7.5rem] sm:items-center sm:p-3 sm:text-center ${
                                  selected
                                    ? "border-cyan-400/80 bg-cyan-950/50 ring-2 ring-cyan-400/40"
                                    : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
                                }`}
                              >
                                <span
                                  className={`mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br p-0.5 ${grad}`}
                                >
                                  <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950/90">
                                    <CapIcon className="h-8 w-8" />
                                  </span>
                                </span>
                                <span className="inline-flex w-fit items-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-100">
                                  {p.code}
                                </span>
                                <span className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white sm:mt-1 sm:text-xs sm:font-black sm:uppercase sm:tracking-wider sm:line-clamp-none">
                                  {p.name}
                                </span>
                                {p.duration && p.duration.totalSemesters > 0 ? (
                                  <span className="mt-2 text-[11px] text-slate-500">
                                    {p.duration.durationYears} year(s) · {p.duration.totalSemesters} semester(s)
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              {selectedProgramme ? (
                <GlassPanel className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected programme</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedProgramme.name}</p>
                  <p className="mt-0.5 text-xs text-cyan-200/90">
                    {PROGRAMME_TRACK_LABEL[selectedProgramme.track]} · Code {selectedProgramme.code}
                  </p>
                  {selectedProgramme.duration && selectedProgramme.duration.totalSemesters > 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Completion: {selectedProgramme.duration.durationYears} year(s),{" "}
                      {selectedProgramme.duration.totalSemesters} semester(s)
                    </p>
                  ) : null}
                </GlassPanel>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</label>
                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(Number(e.target.value));
                      setQuote(null);
                      setSelectedFeeIds([]);
                    }}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => {
                      setSemester(Number(e.target.value));
                      setQuote(null);
                      setSelectedFeeIds([]);
                    }}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white"
                  >
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <BtnPrimary onClick={() => void onContinueFromProgramme()} disabled={busy || !code}>
                Continue
              </BtnPrimary>
            </>
          )}
        </div>
      )}

      {step === "fees_breakdown" && quote && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => {
              setQuote(null);
              setSelectedFeeIds([]);
              setStep("select_programme");
            }}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-cyan-200"
          >
            <span aria-hidden>←</span> Back
          </button>
          <div className="flex items-start gap-3">
            <DocIcon className="h-10 w-10 shrink-0" />
            <div>
              <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">Fees &amp; checkout</h1>
              <p className="mt-1 text-xs text-slate-500">
                Logged in as <span className="text-slate-300">{me.name}</span>
              </p>
            </div>
          </div>

          <GlassPanel className="p-5 text-sm">
            <p className="text-xs text-slate-500">
              Programme: <span className="font-semibold text-cyan-100">{quote.programmeName}</span> ({quote.programmeCode})
              {quote.programmeTrackLabel ? (
                <span className="text-slate-400"> · {quote.programmeTrackLabel}</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Anchor year / semester: <span className="text-slate-200">Year {quote.year}</span> /{" "}
              <span className="text-slate-200">Semester {quote.semester}</span>
            </p>
            {quote.programmeDuration && quote.programmeDuration.totalSemesters > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Full programme: {quote.programmeDuration.durationYears} year(s),{" "}
                {quote.programmeDuration.totalSemesters} semester(s)
              </p>
            ) : null}
          </GlassPanel>

          <GlassPanel className="p-5 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Coverage</p>
            <p className="mt-1 text-xs text-slate-500">
              Pick <strong className="text-slate-300">this semester only</strong>,{" "}
              <strong className="text-slate-300">Year {year} with all its semesters</strong>, or{" "}
              <strong className="text-slate-300">the whole programme</strong> (every year and semester).
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void setCoverageMode("semester")}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                  quote.feeSelectionMode === "semester"
                    ? "border-cyan-400/60 bg-cyan-950/40 text-cyan-50"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30"
                }`}
              >
                <span className="font-bold uppercase tracking-wide">This semester only</span>
                <span className="mt-1 block text-slate-500">Year {year} · Semester {semester}</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void setCoverageMode("year")}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                  quote.feeSelectionMode === "year"
                    ? "border-cyan-400/60 bg-cyan-950/40 text-cyan-50"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30"
                }`}
              >
                <span className="font-bold uppercase tracking-wide">Year {year} with all its semesters</span>
                <span className="mt-1 block text-slate-500">
                  All fee items that apply to any semester in Year {year}
                </span>
              </button>
              {quote.programmeDuration && quote.programmeDuration.totalSemesters > 0 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setCoverageMode("programme")}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                    quote.feeSelectionMode === "programme"
                      ? "border-cyan-400/60 bg-cyan-950/40 text-cyan-50"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30"
                  }`}
                >
                  <span className="font-bold uppercase tracking-wide">
                    Whole programme ({quote.programmeDuration.durationYears}-year course)
                  </span>
                  <span className="mt-1 block text-slate-500">
                    All {quote.programmeDuration.totalSemesters} semester(s) across the entire course
                  </span>
                </button>
              ) : null}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={selectAllFeeLines}
              className="mt-3 w-full rounded-lg border border-white/15 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300 hover:bg-white/[0.05]"
            >
              Select all items in this group
            </button>
          </GlassPanel>

          <GlassPanel className="p-5 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Fee items</p>
            <p className="mt-1 text-xs text-slate-500">
              Tick or untick lines; subtotal, transaction charge, TON estimate, and {OPEN_PAY_BRAND} rails all use the same
              UGX total.
            </p>
            <ul className="mt-3 max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {(quote.poolLines ?? quote.lines).map((line) => {
                const checked = selectedFeeIds.includes(line.id);
                return (
                  <li key={line.id}>
                    <label className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 hover:border-cyan-400/25">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-950"
                        checked={checked}
                        onChange={() => toggleFeeLine(line.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-100">{line.feeKey}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {line.recurrenceLabel} · Year {line.year}
                          {line.semester > 0 ? ` · Sem ${line.semester}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm text-cyan-100/95">
                        UGX {line.lineTotalUgx.toLocaleString()}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </GlassPanel>

          <GlassPanel className="p-5 text-sm">{/* INSTALLMENTS_UI_STUDENT */}
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Installments</p>
            <p className="mt-1 text-xs text-slate-500">Pay in full or split into 2-4 installments. Each installment has its own processing charge.</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Installment count">
              {INSTALLMENT_COUNT_OPTIONS.map((n) => (
                <button key={n} type="button" disabled={busy} onClick={() => void onInstallmentCountChange(n)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${installmentCount === n ? "border-cyan-400/60 bg-cyan-950/40 text-cyan-50" : "border-white/10 text-slate-300"}`}>
                  {n === 1 ? "Pay in full" : `${n} installments`}
                </button>
              ))}
            </div>
            {quote.installmentSchedule && installmentCount > 1 ? (
              <ul className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs">
                {quote.installmentSchedule.slices.map((slice) => (
                  <li key={slice.index} className={`flex justify-between gap-2 rounded-lg px-2 py-1.5 ${slice.index === 1 ? "bg-cyan-950/40 text-cyan-50" : "text-slate-500"}`}>
                    <span>Installment {slice.index}{slice.index === 1 ? " (due now)" : ""}</span>
                    <span className="font-mono text-right">UGX {slice.totalUgx.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </GlassPanel>

          <GlassPanel className="p-5 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Auto calculation</p>
            <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
              <div className="flex justify-between text-slate-400">
                <span>Tuition (selected{installmentCount > 1 ? ", installment 1" : ""})</span>
                <span className="font-mono text-slate-200">UGX {quote.tuitionUgx.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Functional fees (selected{installmentCount > 1 ? ", installment 1" : ""})</span>
                <span className="font-mono text-slate-200">UGX {quote.functionalFeesUgx.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Subtotal{installmentCount > 1 ? " (installment 1)" : ""}</span>
                <span className="font-mono text-slate-200">UGX {quote.subtotalUgx.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Transaction / processing charge{installmentCount > 1 ? " (this installment)" : ""}</span>
                <span className="font-mono text-slate-200">UGX {quote.platformFeeUgx.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black text-white">
                <span>{installmentCount > 1 ? "Due now (installment 1)" : "Total due"}</span>
                <span className="font-mono">UGX {quote.totalUgx.toLocaleString()}</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
              The TON amount includes the lines you selected plus any configured processing fee. Blockchain network fees
              are separate and depend on your wallet.
            </p>
          </GlassPanel>
          <GlassPanel className="border-cyan-400/35 bg-gradient-to-br from-cyan-500/15 to-violet-600/10 p-5 text-center shadow-[0_0_32px_rgba(34,211,238,0.15)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Estimated to TON</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              {quote.tonAmount} TON
            </p>
            <p className="mt-2 text-xs text-slate-500">
              1 TON ≈ UGX {quote.ugxPerTon.toLocaleString()}
              <span className="text-slate-600"> ({formatFxRateSource(quote.rateSource)})</span>
            </p>
          </GlassPanel>
          <BtnPrimary onClick={() => setStep("choose_pay_method")} disabled={busy}>
            Continue to payment method
          </BtnPrimary>
        </div>
      )}

      {step === "choose_pay_method" && quote && me && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep("fees_breakdown")}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-cyan-200"
          >
            <span aria-hidden>←</span> Back
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">Choose how to pay</h1>
            <p className="mt-2 text-sm text-slate-500">
              Logged in as <span className="text-slate-300">{me.name}</span>. Total due{" "}
              <span className="font-semibold text-cyan-100">UGX {quote.totalUgx.toLocaleString()}</span> (same quote for
              {withOpenPayGlobal("TON")}).
            </p>
          </div>
          <GlassPanel className="border-cyan-400/35 bg-cyan-950/25 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">TON Connect</p>
            <p className="mt-2 text-sm text-slate-400">Pay ~{quote.tonAmount} TON from your wallet.</p>
            <div className="mt-4">
              <BtnPrimary onClick={() => void createTonPaymentForStudent()} disabled={busy}>
                Continue with TON
              </BtnPrimary>
            </div>
          </GlassPanel>
          <GlassPanel className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{mbiyoRailSectionLabel}</p>
            <p className="mt-2 text-sm text-slate-400">
              Approve UGX on your phone. Your school record phone is prefilled when we have it; you can change it for this
              payment.
            </p>
            <div className="mt-4">
              <MbiyoPayinFields
                tone="glass"
                disabled={busy}
                countryCode={mbiyoCountryCode}
                setCountryCode={setMbiyoCountryCode}
                network={mbiyoNetwork}
                setNetwork={setMbiyoNetwork}
                phone={mbiyoPhone}
                setPhone={setMbiyoPhone}
                currency={mbiyoCurrency}
                setCurrency={setMbiyoCurrency}
                omOtp={mbiyoOmOtp}
                setOmOtp={setMbiyoOmOtp}
              />
            </div>
            <div className="mt-4">
              <BtnGhost onClick={() => void startStudentMbiyo()} disabled={busy}>
                Pay with {PAYMENT_RAIL_MBIYO}
              </BtnGhost>
            </div>
          </GlassPanel>
          {openPayCardPlatformEnabled ? (
            <GlassPanel className="border-violet-500/30 bg-violet-950/20 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/85">
                {openPayCardRailSectionLabel}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Card balance UGX {openPayCardBalanceUgx.toLocaleString()}. Total due UGX{" "}
                {quote.totalUgx.toLocaleString()}.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={useOpenPayCardAtCheckout}
                  onChange={(e) => setUseOpenPayCardAtCheckout(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20"
                />
                Pay with {PAYMENT_RAIL_OPENPAY_CARD}
              </label>
              {useOpenPayCardAtCheckout ? (
                <div className="mt-4">
                  <BtnGhost
                    onClick={() => void payTuitionWithOpenPayCard()}
                    disabled={busy || !openPayCardCanPay || openPayCardBalanceUgx < quote.totalUgx}
                  >
                    Pay from card balance
                  </BtnGhost>
                  {!openPayCardCanPay ? (
                    <p className="mt-2 text-xs text-amber-300/90">
                      Activate your card on the{" "}
                      <Link href="/student" className="underline">
                        student home
                      </Link>{" "}
                      first.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </GlassPanel>
          ) : null}
          {livepayEnabled ? (
            <GlassPanel className="border-emerald-500/25 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/85">{livepayRailSectionLabel}</p>
              <p className="mt-2 text-sm text-slate-400">Uganda MTN or Airtel — UGX {quote.totalUgx.toLocaleString()}.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-slate-500">
                  Network
                  <select
                    value={livepayNetwork}
                    onChange={(e) => setLivepayNetwork(e.target.value as "mtn" | "airtel")}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  >
                    <option value="mtn">MTN</option>
                    <option value="airtel">Airtel</option>
                  </select>
                </label>
                <label className="block text-xs text-slate-500">
                  Mobile number
                  <input
                    value={livepayPhone}
                    onChange={(e) => setLivepayPhone(e.target.value)}
                    placeholder="0777123456"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </label>
              </div>
              <div className="mt-4">
                <BtnGhost onClick={() => void startStudentLivepay()} disabled={busy}>
                  Pay with {PAYMENT_RAIL_LIVEPAY}
                </BtnGhost>
              </div>
            </GlassPanel>
          ) : null}
          {relworxEnabled ? (
            <GlassPanel className="border-sky-500/25 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/85">{relworxRailSectionLabel}</p>
              <p className="mt-2 text-sm text-slate-400">Uganda MTN/Airtel via Relworx — UGX {quote.totalUgx.toLocaleString()}.</p>
              <label className="mt-4 block text-xs text-slate-500">
                Mobile number
                <input
                  value={livepayPhone}
                  onChange={(e) => setLivepayPhone(e.target.value)}
                  placeholder="0777123456"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>
              <div className="mt-4">
                <BtnGhost onClick={() => void startStudentRelworx()} disabled={busy}>
                  Pay with {PAYMENT_RAIL_RELWORX}
                </BtnGhost>
              </div>
            </GlassPanel>
          ) : null}
        </div>
      )}

      {step === "mbiyo_waiting" && paymentId && quote && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => {
              setPaymentId(null);
              setPayChannel(null);
              setChainStatus("pending");
              setMbiyoRedirectUrl(null);
              setMbiyoInstructions(null);
              setMbiyoAuthMode(null);
              setMbiyoCollect(null);
              setStep("choose_pay_method");
            }}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-cyan-200"
          >
            <span aria-hidden>←</span> Change method
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">Complete on your phone</h1>
            <p className="mt-2 text-sm text-slate-400">
              {mbiyoCollect ? (
                <>
                  Approve{" "}
                  <span className="font-semibold text-cyan-100">
                    {mbiyoCollect.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {mbiyoCollect.currency}
                  </span>{" "}
                  on your handset (quoted tuition: UGX {quote.totalUgx.toLocaleString()}). This page updates when your payment
                  confirms.
                </>
              ) : (
                <>
                  Pay with{" "}
                  {payChannel === "livepay"
                    ? PAYMENT_RAIL_LIVEPAY
                    : payChannel === "relworx"
                      ? PAYMENT_RAIL_RELWORX
                      : PAYMENT_RAIL_MBIYO}{" "}
                  ({OPEN_PAY_BRAND}). Tuition quoted as UGX {quote.totalUgx.toLocaleString()}; approve the wallet
                  amount shown on your phone. This page updates when your payment confirms.
                </>
              )}
            </p>
          </div>
          {mbiyoRedirectUrl ? (
            <a
              href={mbiyoRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-600 py-3.5 text-sm font-bold uppercase tracking-wide text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.3)] hover:brightness-110"
            >
              Open payment link
            </a>
          ) : null}
          {mbiyoInstructions ? (
            <GlassPanel className="p-4 text-left text-sm text-slate-200 whitespace-pre-wrap">
              {mbiyoInstructions}
            </GlassPanel>
          ) : (
            <p className="text-sm text-slate-500">Follow the prompt on your handset if no extra instructions appear here.</p>
          )}
          {mbiyoAuthMode ? (
            <p className="text-xs text-slate-600">
              Operator auth mode: <span className="font-mono text-slate-400">{mbiyoAuthMode}</span>
            </p>
          ) : null}
          <div className="flex flex-col items-center py-8">
            <div
              className="relative flex h-24 w-24 items-center justify-center"
              aria-hidden
            >
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-violet-500 animate-spin"
                style={{ animationDuration: "1.1s" }}
              />
            </div>
            <p className="mt-4 text-xs text-slate-500">Waiting for confirmation…</p>
          </div>
        </div>
      )}

      {step === "connect_wallet" && paymentId && quote && (
        <div className="space-y-8 text-center">
          <button
            type="button"
            onClick={() => {
              setPaymentId(null);
              setPayChannel(null);
              setStep("fees_breakdown");
            }}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-cyan-200"
          >
            <span aria-hidden>←</span> Back
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancelCurrentPendingPayment()}
            className="block text-xs font-bold uppercase tracking-wide text-rose-400 hover:text-rose-300 disabled:opacity-50"
          >
            Cancel pending payment
          </button>
          <h1 className="text-lg font-black uppercase tracking-[0.2em] text-white">Connect wallet</h1>
          <p className="text-sm text-slate-500">Scan with your wallet app or choose below.</p>
          <GlassPanel className="flex flex-col items-center justify-center p-8">
            <div className="rounded-2xl border-2 border-cyan-400/50 bg-slate-950/90 p-6 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
              <TonConnectButton />
            </div>
          </GlassPanel>
          {wallet ? (
            <p className="text-xs font-mono text-emerald-300/90">Connected: {abbrevMiddle(wallet.account.address, 6, 4)}</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {["Tonkeeper", "MyTonWallet", "OpenMask", "Telegram"].map((w) => (
              <span key={w} className="rounded-full border border-white/10 px-2 py-1 text-slate-500">
                {w}
              </span>
            ))}
          </div>
          <BtnGhost
            onClick={() => setStep("confirm_payment")}
            disabled={!wallet?.account?.address?.trim()}
          >
            Continue to confirm payment
          </BtnGhost>
          {!wallet?.account?.address?.trim() ? (
            <p className="text-xs text-slate-500">Connect a wallet above to continue.</p>
          ) : null}
        </div>
      )}

      {step === "confirm_payment" && paymentId && quote && (
        <div className="space-y-6">
          <button type="button" onClick={() => setStep("connect_wallet")} className="text-xs font-bold uppercase text-slate-500 hover:text-cyan-200">
            ← Back
          </button>
          <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">Confirm payment</h1>
          <p className="text-sm text-slate-400">
            You are about to pay <span className="font-bold text-cyan-200">{tonDisplay} TON</span> (≈ UGX{" "}
            {quote.totalUgx.toLocaleString()}).
          </p>
          <GlassPanel className="space-y-4 p-5 text-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">To address</span>
                <button
                  type="button"
                  onClick={() => copyText(quote.destinationWallet)}
                  className="text-[10px] font-bold uppercase text-cyan-400 hover:text-cyan-300"
                >
                  Copy
                </button>
              </div>
              <p className="mt-2 font-mono text-xs text-cyan-100/90">{abbrevMiddle(quote.destinationWallet, 5, 4)}</p>
              <p className="mt-1 break-all font-mono text-[10px] leading-relaxed text-slate-600">{quote.destinationWallet}</p>
            </div>
            {paymentMemo ? (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Note</span>
                <p className="mt-2 break-words font-mono text-xs text-violet-200/90">{paymentMemo}</p>
              </div>
            ) : null}
          </GlassPanel>
          <BtnPrimary
            onClick={() => void sendTonWithWallet()}
            disabled={busy || !wallet?.account?.address?.trim()}
          >
            Confirm &amp; pay
          </BtnPrimary>
          {walletNote ? <p className="text-center text-xs text-rose-400">{walletNote}</p> : null}
        </div>
      )}

      {step === "processing" && paymentId && quote && (
        <div className="flex flex-col items-center justify-center space-y-8 py-16 text-center">
          <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">Payment processing</h1>
          <div className="relative flex h-36 w-36 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-violet-500 animate-spin"
              style={{ animationDuration: "1.1s" }}
            />
            <div className="absolute inset-3 rounded-full border border-white/10 bg-slate-950/90 shadow-[inset_0_0_24px_rgba(34,211,238,0.12)]" />
            <TonMark className="relative z-10 h-14 w-14 text-base" />
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-slate-500">
            Please wait while we confirm your TON transfer… This may take a few seconds.
          </p>
        </div>
      )}

      {step === "success" && paymentId && quote && (
        <div className="space-y-8 py-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 shadow-[0_0_48px_rgba(52,211,153,0.45)] ring-2 ring-emerald-400/50">
            <span className="text-4xl text-emerald-300" aria-hidden>
              ✓
            </span>
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">Payment success</h1>
            <p className="mt-3 text-sm text-slate-400">
              {payChannel === "openpay_card" ? (
                <>
                  Your payment of{" "}
                  <span className="font-bold text-cyan-200">UGX {quote.totalUgx.toLocaleString()}</span> via{" "}
                  {PAYMENT_RAIL_OPENPAY_CARD} has been confirmed.
                </>
              ) : payChannel === "mbiyo" || payChannel === "livepay" || payChannel === "relworx" ? (
                <>
                  Your payment of{" "}
                  <span className="font-bold text-cyan-200">UGX {quote.totalUgx.toLocaleString()}</span> via{" "}
                  {payChannel === "livepay"
                    ? PAYMENT_RAIL_LIVEPAY
                    : payChannel === "relworx"
                      ? PAYMENT_RAIL_RELWORX
                      : PAYMENT_RAIL_MBIYO}{" "}
                  has been confirmed.
                </>
              ) : (
                <>
                  Your payment of <span className="font-bold text-cyan-200">{tonDisplay} TON</span> has been confirmed.
                </>
              )}
            </p>
          </div>
          {confirmedTxHash ? (
            <GlassPanel className="p-4 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction hash</p>
              <div className="mt-2 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-xs text-cyan-100/90">{abbrevMiddle(confirmedTxHash, 4, 4)}</p>
                <button
                  type="button"
                  onClick={() => copyText(confirmedTxHash)}
                  className="shrink-0 text-[10px] font-bold uppercase text-cyan-400 hover:text-cyan-300"
                >
                  Copy
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{confirmedTxHash}</p>
            </GlassPanel>
          ) : null}
          <div className="flex flex-col gap-3">
            <a
              href={`/api/receipts/${paymentId}/pdf`}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-600 py-3.5 text-sm font-bold uppercase tracking-wide text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.3)] hover:brightness-110"
            >
              Download receipt
            </a>
            <Link
              href="/student"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-cyan-400/35 py-3.5 text-sm font-bold uppercase tracking-wide text-cyan-100 hover:bg-white/[0.05]"
            >
              Go to dashboard
            </Link>
            <Link href={`/receipt/${paymentId}`} className="text-xs text-slate-500 underline hover:text-cyan-300">
              View receipt page
            </Link>
          </div>
          <button type="button" onClick={resetFlow} className="text-[11px] uppercase tracking-wide text-slate-600 hover:text-slate-400">
            Pay another term
          </button>
        </div>
      )}
    </div>
  );
}
