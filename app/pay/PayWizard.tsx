"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { useTonPay } from "@ton-pay/ui-react";
import {
  PROGRAMME_TRACK_INSERVICE,
  PROGRAMME_TRACK_LABEL,
  PROGRAMME_TRACK_REGULAR,
  type ProgrammeTrackValue,
} from "@/lib/programme-track";
import {
  buildInstallmentSchedule,
  type InstallmentCountOption,
  type InstallmentSchedule,
} from "@/lib/installments";
import { MbiyoPayinFields } from "@/components/pay/MbiyoPayinFields";
import { TuitionCheckoutStepper } from "@/components/pay/TuitionCheckoutStepper";
import { toE164FromNational } from "@/lib/mbiyo-checkout-form";
import {
  mbiyoRailSectionLabel,
  livepayRailSectionLabel,
  mobileMoneyRailsLabel,
  OPEN_PAY_BRAND,
  openPayCardRailSectionLabel,
  PAYMENT_RAIL_MBIYO,
  PAYMENT_RAIL_LIVEPAY,
  PAYMENT_RAIL_RELWORX,
  PAYMENT_RAIL_VIXONPAY,
  PAYMENT_RAIL_OPENPAY_CARD,
  relworxRailSectionLabel,
  vixonpayRailSectionLabel,
  withMobileMoneyRails,
} from "@/lib/open-pay-brand";
import { PayFeesBreakdown } from "@/components/pay/PayFeesBreakdown";
import { feePoolForDisplay } from "@/lib/tuition-quote-display";
import { ugxToTon } from "@/lib/money";
import { ugandaPhoneToE164 } from "@/lib/livepay/uganda-phone";
import {
  TuitionBalancePanel,
  type BalanceInstallmentPlan,
  type TuitionBalanceData,
} from "@/components/tuition/TuitionBalancePanel";
import { cancelCheckoutPayment } from "@/utils/cancel-checkout-payment";
import { checkoutAuthHeaders, setCheckoutToken } from "@/utils/checkout-session-client";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { TonConnectDevBridgeNotice } from "@/components/TonConnectDevBridgeNotice";
import { SchoolCheckoutBanner } from "@/components/pay/SchoolCheckoutBanner";
import { readJsonResponse } from "@/utils/read-json-response";
import { fetchPaymentPublicStatus } from "@/utils/fetch-payment-public";
import { usePaymentStatusPoll } from "@/hooks/usePaymentStatusPoll";
import { InsufficientFundsTopupCallout } from "@/components/pay/InsufficientFundsTopupCallout";
import { GuestWelcomeBanner } from "@/components/pay/GuestWelcomeBanner";
import {
  checkoutPaymentErrorMessage,
  checkoutTopupRailFromPayChannel,
  isInsufficientFundsMessage,
  type CheckoutTopupRail,
} from "@/lib/checkout-insufficient-funds";

import type { InstitutionTier } from "@prisma/client";
import { academicPeriodLabels, periodIndexOptions } from "@/lib/academic-period";

type Programme = {
  id: string;
  code: string;
  name: string;
  track: ProgrammeTrackValue;
  semestersPerYear?: number;
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
  programmeDuration?: { durationYears: number; semestersPerYear: number; totalSemesters: number };
};

function normalizeFeeSelectionMode(value: unknown): FeeSelectionMode {
  if (value === "year") return "year";
  if (value === "programme") return "programme";
  return "semester";
}

type CoveragePreviewLine = {
  id: string;
  feeKey: string;
  recurrenceLabel: string;
  year: number;
  semester: number;
  lineTotalUgx: number;
};

type CoveragePreviewBucket = {
  totalUgx: number;
  itemCount: number;
  lines: CoveragePreviewLine[];
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

const years = [1, 2, 3, 4, 5, 6];

function abbrevMiddle(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function ResumeCheckoutEmailGate({
  resumeEmail,
  onResumeEmailChange,
  busy,
  onVerify,
}: {
  resumeEmail: string;
  onResumeEmailChange: (value: string) => void;
  busy: boolean;
  onVerify: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-left">
      <p className="text-sm text-amber-100">
        Enter the email on file for this student to resume checkout from your link.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={resumeEmail}
          onChange={(e) => onResumeEmailChange(e.target.value)}
          placeholder="student@email.com"
          className="flex-1 rounded-lg border border-white/20 bg-slate-900/80 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={busy}
          onClick={onVerify}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          Verify & continue
        </button>
      </div>
    </div>
  );
}

export function PayWizard({
  organizationSlug = "default",
  organizationName,
  institutionTier = "university",
}: {
  organizationSlug?: string;
  organizationName?: string;
  institutionTier?: InstitutionTier;
}) {
  const orgSlug = organizationSlug.trim().toLowerCase() || "default";
  const displayName = organizationName?.trim() || "ODEL HUB";
  const periodLabels = academicPeriodLabels(institutionTier);

  const [step, setStep] = useState<FlowStep>("landing");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [code, setCode] = useState<string>("");
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [feeSelectionMode, setFeeSelectionMode] = useState<FeeSelectionMode>("semester");
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [walletNote, setWalletNote] = useState<string | null>(null);
  const [paymentMemo, setPaymentMemo] = useState<string | null>(null);
  const [paymentTonAmount, setPaymentTonAmount] = useState<number | null>(null);
  const [chainStatus, setChainStatus] = useState<"pending" | "confirmed">("pending");
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const [payChannel, setPayChannel] = useState<
    "ton" | "mbiyo" | "livepay" | "relworx" | "vixonpay" | "openpay_card" | null
  >(null);
  const [livepayEnabled, setLivepayEnabled] = useState(false);
  const [relworxEnabled, setRelworxEnabled] = useState(false);
  const [vixonpayEnabled, setVixonpayEnabled] = useState(false);
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
  const [receiptAccessToken, setReceiptAccessToken] = useState<string | null>(null);
  const [mbiyoAuthMode, setMbiyoAuthMode] = useState<string | null>(null);
  const [mbiyoCollect, setMbiyoCollect] = useState<{ amount: number; currency: string } | null>(null);
  const [installmentCount, setInstallmentCount] = useState<InstallmentCountOption>(1);
  const [checkoutStudentId, setCheckoutStudentId] = useState<string | null>(null);
  const [resumeEmail, setResumeEmail] = useState("");
  const [needsCheckoutSession, setNeedsCheckoutSession] = useState(false);
  const [balance, setBalance] = useState<TuitionBalanceData | null>(null);
  const [coveragePreview, setCoveragePreview] = useState<{
    semester: CoveragePreviewBucket | null;
    year: CoveragePreviewBucket | null;
    programme: CoveragePreviewBucket | null;
  }>({ semester: null, year: null, programme: null });
  const wallet = useTonWallet();
  const { pay } = useTonPay();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/livepay-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean } | null) => {
        if (!cancelled) setLivepayEnabled(Boolean(j?.enabled));
      })
      .catch(() => {
        if (!cancelled) setLivepayEnabled(false);
      });
    void fetch("/api/public/relworx-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean } | null) => {
        if (!cancelled) setRelworxEnabled(Boolean(j?.enabled));
      })
      .catch(() => {
        if (!cancelled) setRelworxEnabled(false);
      });
    void fetch("/api/public/vixonpay-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean } | null) => {
        if (!cancelled) setVixonpayEnabled(Boolean(j?.enabled));
      })
      .catch(() => {
        if (!cancelled) setVixonpayEnabled(false);
      });
    void fetch("/api/public/openpay-card-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean } | null) => {
        if (!cancelled) setOpenPayCardPlatformEnabled(Boolean(j?.enabled));
      })
      .catch(() => {
        if (!cancelled) setOpenPayCardPlatformEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checkoutStudentId || !openPayCardPlatformEnabled) {
      setOpenPayCardCanPay(false);
      setOpenPayCardBalanceUgx(0);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/public/checkout/openpay-card-eligibility?studentId=${encodeURIComponent(checkoutStudentId)}`,
      { credentials: "include", headers: checkoutAuthHeaders(orgSlug) },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (j: { canPayTuition?: boolean; balanceUgx?: number; status?: string } | null) => {
          if (cancelled || !j) return;
          setOpenPayCardCanPay(Boolean(j.canPayTuition && j.status === "active"));
          setOpenPayCardBalanceUgx(typeof j.balanceUgx === "number" ? j.balanceUgx : 0);
        },
      )
      .catch(() => {
        if (!cancelled) {
          setOpenPayCardCanPay(false);
          setOpenPayCardBalanceUgx(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutStudentId, openPayCardPlatformEnabled, orgSlug]);

  useEffect(() => {
    if (searchParams.get("programmes") !== "1") return;
    setGetStartedOpen(false);
    setStep("select_programme");
    router.replace(pathname || "/", { scroll: false });
  }, [searchParams, pathname, router]);

  const establishCheckoutSession = useCallback(
    async (
      studentId: string,
      email?: string,
    ): Promise<{ ok: true } | { ok: false; needsEmail: boolean; error?: string }> => {
      const r = await fetch("/api/public/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationSlug: orgSlug,
          studentId,
          ...(email?.trim() ? { email: email.trim() } : {}),
        }),
      });
      const j = (await r.json()) as { error?: string; checkoutToken?: string; needsEmail?: boolean };
      if (r.ok) {
        if (j.needsEmail) {
          return { ok: false, needsEmail: true, error: j.error };
        }
        if (j.checkoutToken) setCheckoutToken(orgSlug, j.checkoutToken);
        return { ok: true };
      }
      if (r.status === 403) {
        return { ok: false, needsEmail: true, error: j.error };
      }
      return { ok: false, needsEmail: false, error: j.error ?? "Could not start checkout session" };
    },
    [orgSlug],
  );

  const loadGuestBalance = useCallback(
    async (studentId: string) => {
      const fetchBalance = () => {
        const q = new URLSearchParams({ organizationSlug: orgSlug, studentId });
        return fetch(`/api/public/checkout/balance?${q.toString()}`, {
          headers: checkoutAuthHeaders(orgSlug),
          credentials: "include",
        });
      };

      let r = await fetchBalance();
      if (r.status === 401) {
        const session = await establishCheckoutSession(studentId);
        if (!session.ok) {
          if (session.needsEmail) {
            setNeedsCheckoutSession(true);
            return;
          }
          setError(session.error ?? "Could not resume checkout");
          return;
        }
        setNeedsCheckoutSession(false);
        r = await fetchBalance();
      } else {
        setNeedsCheckoutSession(false);
      }

      if (r.status === 401) {
        setNeedsCheckoutSession(true);
        return;
      }
      if (!r.ok) return;
      const j = (await r.json()) as { balance?: TuitionBalanceData | null };
      if (j.balance) setBalance(j.balance);
    },
    [orgSlug, establishCheckoutSession],
  );

  useEffect(() => {
    const sid = searchParams.get("studentId")?.trim();
    if (!sid) return;
    setCheckoutStudentId(sid);
    void loadGuestBalance(sid);
  }, [searchParams, orgSlug, loadGuestBalance]);

  useEffect(() => {
    const requestId = searchParams.get("request")?.trim();
    if (!requestId) return;
    let cancelled = false;
    void fetch(`/api/public/payment-requests/${encodeURIComponent(requestId)}`)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j: { request?: { studentId?: string | null; programmeCode?: string; year?: number; semester?: number; amountUgx?: number; memo?: string } } | null) => {
        if (cancelled || !j?.request) return;
        const req = j.request;
        if (req.studentId) {
          setCheckoutStudentId(req.studentId);
          void loadGuestBalance(req.studentId);
        }
        if (req.programmeCode) setCode(req.programmeCode);
        if (req.year) setYear(req.year);
        if (req.semester) setSemester(req.semester);
        if (req.memo) setPaymentMemo(req.memo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [searchParams, loadGuestBalance]);

  async function claimCheckoutSession() {
    if (!checkoutStudentId) return;
    setError(null);
    setBusy(true);
    try {
      const session = await establishCheckoutSession(checkoutStudentId, resumeEmail);
      if (!session.ok) throw new Error(session.error ?? "Could not verify checkout session");
      setNeedsCheckoutSession(false);
      await loadGuestBalance(checkoutStudentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify email");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = new URLSearchParams();
    q.set("orgSlug", orgSlug);
    fetch(`/api/programmes?${q.toString()}`)
      .then(async (r) => {
        const parsed = await readJsonResponse<{
          programmes?: (Programme & { track?: string })[];
          error?: string;
        }>(r);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
        const d = parsed.data;
        if (!d.programmes && d.error) {
          setError(d.error);
          return;
        }
        const list = (d.programmes ?? []).map((p) => ({
          ...p,
          track: p.track === PROGRAMME_TRACK_INSERVICE ? PROGRAMME_TRACK_INSERVICE : PROGRAMME_TRACK_REGULAR,
        }));
        setProgrammes(list);
        if (list[0]?.code) setCode(list[0].code);
      })
      .catch(() => setError("Could not load programmes"));
  }, [orgSlug]);

  const { inserviceRows, regularRows } = useMemo(() => {
    const inserviceRows: Programme[] = [];
    const regularRows: Programme[] = [];
    for (const p of programmes) {
      if (p.track === PROGRAMME_TRACK_INSERVICE) inserviceRows.push(p);
      else regularRows.push(p);
    }
    return { inserviceRows, regularRows };
  }, [programmes]);

  const applyPaymentStatus = useCallback(
    (payment: {
      status: string;
      memo?: string | null;
      txHash?: string;
      receiptAccessToken?: string | null;
    }) => {
      if (payment.status !== "confirmed") return;
      setChainStatus("confirmed");
      if (typeof payment.memo === "string") setPaymentMemo(payment.memo);
      if (typeof payment.txHash === "string" && payment.txHash.trim()) {
        setConfirmedTxHash(payment.txHash.trim());
      }
      if (typeof payment.receiptAccessToken === "string" && payment.receiptAccessToken.trim()) {
        setReceiptAccessToken(payment.receiptAccessToken.trim());
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

  const tonDisplay = paymentTonAmount ?? quote?.tonAmount ?? 0;

  const insufficientFundsRail = useMemo((): CheckoutTopupRail | null => {
    const msg = error ?? walletNote;
    if (!isInsufficientFundsMessage(msg)) return null;
    if (
      step === "confirm_payment" ||
      step === "processing" ||
      step === "connect_wallet" ||
      payChannel === "ton"
    ) {
      return "ton";
    }
    const fromChannel = checkoutTopupRailFromPayChannel(payChannel);
    if (fromChannel) return fromChannel;
    if (step === "mbiyo_waiting") return "momo";
    return null;
  }, [error, walletNote, payChannel, step]);

  const selectedProgramme = useMemo(() => programmes.find((p) => p.code === code), [programmes, code]);
  const periodOptions = useMemo(
    () => periodIndexOptions(selectedProgramme?.semestersPerYear ?? quote?.programmeDuration?.semestersPerYear),
    [selectedProgramme?.semestersPerYear, quote?.programmeDuration?.semestersPerYear],
  );

  const buildCoverageBucket = useCallback(
    (j: Quote): CoveragePreviewBucket => {
      const pool = feePoolForDisplay(j);
      return {
        totalUgx: j.subtotalUgx + j.platformFeeUgx,
        itemCount: pool.length,
        lines: pool.map((line) => ({
          id: line.id,
          feeKey: line.feeKey,
          recurrenceLabel: line.recurrenceLabel,
          year: line.year,
          semester: line.semester,
          lineTotalUgx: line.lineTotalUgx,
        })),
      };
    },
    [],
  );

  const quoteUrl = useCallback((mode: FeeSelectionMode, feeIds: string[] | null, qCode: string) => {
    const qs = new URLSearchParams();
    qs.set("year", String(year));
    qs.set("semester", String(semester));
    qs.set("orgSlug", orgSlug);
    qs.set("feeSelectionMode", mode);
    if (feeIds && feeIds.length > 0) {
      qs.set("feeIds", [...feeIds].sort().join(","));
    }
    return `/api/programmes/${encodeURIComponent(qCode)}/quote?${qs.toString()}`;
  }, [year, semester, orgSlug]);

  useEffect(() => {
    if (step !== "fees_breakdown" || !code) return;
    let cancelled = false;
    void (async () => {
      async function preview(mode: FeeSelectionMode) {
        try {
          const r = await fetch(quoteUrl(mode, null, code));
          const j = (await r.json()) as Quote & { error?: string };
          if (!r.ok) return null;
          return buildCoverageBucket(j);
        } catch {
          return null;
        }
      }
      const [semester, year, programme] = await Promise.all([
        preview("semester"),
        preview("year"),
        preview("programme"),
      ]);
      if (!cancelled) setCoveragePreview({ semester, year, programme });
    })();
    return () => {
      cancelled = true;
    };
  }, [step, code, quoteUrl, buildCoverageBucket]);

  async function loadQuote(opts?: {
    mode?: FeeSelectionMode;
    feeIds?: string[];
    useFullPool?: boolean;
    installmentCount?: InstallmentCountOption;
  }): Promise<Quote | null> {
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
          return null;
        }
        feeIdsParam = opts.feeIds;
      } else if (selectedFeeIds.length > 0 && quote) {
        const poolSrc = feePoolForDisplay(quote);
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
      const subtotalUgx =
        typeof j.subtotalUgx === "number" ? j.subtotalUgx : j.tuitionUgx + j.functionalFeesUgx;
      const platformFeeUgx = typeof j.platformFeeUgx === "number" ? j.platformFeeUgx : 0;
      const schedule = buildInstallmentSchedule(subtotalUgx, platformFeeUgx, payInstallments);
      const firstSlice = schedule.slices[0];
      const instSubtotal = firstSlice?.subtotalUgx ?? subtotalUgx;
      const ratio = subtotalUgx > 0 ? instSubtotal / subtotalUgx : 1;
      const instTuition = Math.round(j.tuitionUgx * ratio);
      const instFunctional = instSubtotal - instTuition;
      const next: Quote = {
        ...j,
        lines,
        poolLines,
        feeSelectionMode: normalizeFeeSelectionMode(j.feeSelectionMode),
        tuitionUgx: instTuition,
        functionalFeesUgx: instFunctional,
        subtotalUgx: instSubtotal,
        platformFeeUgx,
        totalUgx: firstSlice?.totalUgx ?? j.totalUgx,
        tonAmount:
          typeof j.ugxPerTon === "number" && j.ugxPerTon > 0
            ? ugxToTon(firstSlice?.totalUgx ?? j.totalUgx, j.ugxPerTon)
            : j.tonAmount,
        isFullSelection: Boolean(j.isFullSelection),
        poolLineCount: typeof j.poolLineCount === "number" ? j.poolLineCount : poolLines.length,
        installmentSchedule: schedule,
      };
      setFeeSelectionMode(next.feeSelectionMode);
      setQuote(next);
      setSelectedFeeIds(lines.map((l) => l.id));
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed");
      setQuote(null);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function prefetchCoveragePreviews(semesterQuote: Quote) {
    const semester = buildCoverageBucket(semesterQuote);
    setCoveragePreview({ semester, year: null, programme: null });
    async function preview(mode: "year" | "programme") {
      try {
        const r = await fetch(quoteUrl(mode, null, code));
        const j = (await r.json()) as Quote & { error?: string };
        if (!r.ok) return null;
        return buildCoverageBucket(j);
      } catch {
        return null;
      }
    }
    const [year, programme] = await Promise.all([preview("year"), preview("programme")]);
    setCoveragePreview({ semester, year, programme });
  }

  async function onContinueFromProgramme() {
    setFeeSelectionMode("semester");
    setSelectedFeeIds([]);
    setQuote(null);
    setCoveragePreview({ semester: null, year: null, programme: null });
    const semesterQuote = await loadQuote({ mode: "semester", useFullPool: true });
    if (!semesterQuote) return;
    void prefetchCoveragePreviews(semesterQuote);
    setStep("fees_breakdown");
  }

  function toggleFeeLine(id: string) {
    if (!quote) return;
    const poolSrc = feePoolForDisplay(quote);
    const poolIds = poolSrc.map((l) => l.id);
    const set = new Set(selectedFeeIds.length > 0 ? selectedFeeIds : poolIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = [...set];
    if (next.length === 0) {
      setError("Pick at least one fee item.");
      return;
    }
    void loadQuote({ mode: quote.feeSelectionMode, feeIds: next });
  }

  function selectAllFeeLines() {
    if (!quote) return;
    void loadQuote({ mode: quote.feeSelectionMode, useFullPool: true });
  }

  async function setCoverageMode(mode: FeeSelectionMode) {
    setSelectedFeeIds([]);
    const next = await loadQuote({ mode, useFullPool: true });
    if (!next) return;
    const bucket = buildCoverageBucket(next);
    setCoveragePreview((prev) => ({
      semester: mode === "semester" ? bucket : prev.semester,
      year: mode === "year" ? bucket : prev.year,
      programme: mode === "programme" ? bucket : prev.programme,
    }));
  }

  async function onInstallmentCountChange(count: InstallmentCountOption) {
    setInstallmentCount(count);
    if (!quote) return;
    const poolSrc = feePoolForDisplay(quote);
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
    if (!paymentId || !checkoutStudentId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await cancelCheckoutPayment({
        paymentId,
        organizationSlug: orgSlug,
        studentId: checkoutStudentId,
      });
      if (!r.ok) throw new Error(r.error ?? "Could not cancel");
      setPaymentId(null);
      setPaymentMemo(null);
      setPaymentTonAmount(null);
      setPayChannel(null);
      setStep("fees_breakdown");
      const br = await fetch(
        `/api/public/checkout/balance?organizationSlug=${encodeURIComponent(orgSlug)}&studentId=${encodeURIComponent(checkoutStudentId)}`,
        { headers: checkoutAuthHeaders(orgSlug), credentials: "include" },
      );
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

  async function payResumeInstallmentGuest(plan: BalanceInstallmentPlan) {
    const studentId = checkoutStudentId;
    if (!studentId || !plan.nextDueIndex) return;
    setError(null);
    setBusy(true);
    try {
      setCode(plan.programmeCode);
      setYear(plan.year);
      setSemester(plan.semester);
      const rp = await fetch("/api/public/checkout/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
        credentials: "include",
        body: JSON.stringify({
          organizationSlug: orgSlug,
          studentId,
          programmeCode: plan.programmeCode,
          year: plan.year,
          semester: plan.semester,
          rail: "web",
          installmentPlanId: plan.installmentPlanId,
          installmentIndex: plan.nextDueIndex,
          feeSelectionMode: plan.feeSelectionMode,
        }),
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start installment payment");
    } finally {
      setBusy(false);
    }
  }

  async function createStudentAndTonPayment() {
    setError(null);
    setBusy(true);
    try {
      if (!quote) throw new Error("Load quote first");
      const rs = await fetch("/api/public/checkout/student", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
        credentials: "include",
        body: JSON.stringify({
          organizationSlug: orgSlug,
          name: studentName,
          email: studentEmail || undefined,
          programmeCode: code,
          year,
          semester,
        }),
      });
      const sj = await rs.json();
      if (!rs.ok) throw new Error(sj.error ?? "Student create failed");
      setCheckoutStudentId(sj.student.id);
      if (typeof sj.checkoutToken === "string") setCheckoutToken(orgSlug, sj.checkoutToken);
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: sj.student.id,
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
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
        credentials: "include",
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
      setError(checkoutPaymentErrorMessage(e, "Could not start payment"));
    } finally {
      setBusy(false);
    }
  }

  async function startGuestMbiyo() {
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    if (!studentName.trim()) {
      setError("Enter your full name.");
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
        name: studentName.trim(),
        email: studentEmail.trim() || "",
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
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        checkoutToken?: string;
        payment?: { id: string; studentId?: string; memo?: string | null };
        mbiyo?: {
          collectAmount?: number;
          quotedUgx?: number;
          currency?: string | null;
          redirectUrl?: string | null;
          instructions?: string | null;
          authMode?: string | null;
        };
      };
      if (!r.ok) throw new Error(j.error ?? `Could not start ${PAYMENT_RAIL_MBIYO} payment`);
      if (!j.payment?.id) throw new Error(`Invalid ${PAYMENT_RAIL_MBIYO} response`);
      if (j.checkoutToken) setCheckoutToken(orgSlug, j.checkoutToken);
      if (j.payment.studentId) setCheckoutStudentId(j.payment.studentId);
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
      setError(checkoutPaymentErrorMessage(e, `Could not start ${PAYMENT_RAIL_MBIYO} payment`));
    } finally {
      setBusy(false);
    }
  }

  async function startGuestLivepay() {
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    if (!studentName.trim()) {
      setError("Enter your full name.");
      return;
    }
    const phone = ugandaPhoneToE164(livepayPhone.trim());
    if (!phone) {
      setError("Enter a valid Uganda mobile number (e.g. 0777123456 or +256777123456).");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        name: studentName.trim(),
        email: studentEmail.trim() || "",
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
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        checkoutToken?: string;
        payment?: { id: string; studentId?: string; memo?: string | null };
        livepay?: { message?: string; network?: string };
      };
      if (!r.ok) throw new Error(j.error ?? "Could not start LivePay payment");
      if (!j.payment?.id) throw new Error("Invalid LivePay response");
      if (j.checkoutToken) setCheckoutToken(orgSlug, j.checkoutToken);
      if (j.payment.studentId) setCheckoutStudentId(j.payment.studentId);
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
      setError(checkoutPaymentErrorMessage(e, "Could not start LivePay payment"));
    } finally {
      setBusy(false);
    }
  }

  async function startGuestVixonpay() {
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    if (!studentName.trim()) {
      setError("Enter your full name.");
      return;
    }
    const phone = ugandaPhoneToE164(livepayPhone.trim());
    if (!phone) {
      setError("Enter a valid Uganda mobile number (e.g. 0777123456 or +256777123456).");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        name: studentName.trim(),
        email: studentEmail.trim() || "",
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
      const r = await fetch("/api/public/checkout/vixonpay-start", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        checkoutToken?: string;
        payment?: { id: string; studentId?: string; memo?: string | null };
        vixonpay?: { message?: string };
      };
      if (!r.ok) throw new Error(j.error ?? "Could not start VixonPay payment");
      if (!j.payment?.id) throw new Error("Invalid VixonPay response");
      if (j.checkoutToken) setCheckoutToken(orgSlug, j.checkoutToken);
      if (j.payment.studentId) setCheckoutStudentId(j.payment.studentId);
      setPayChannel("vixonpay");
      setPaymentId(j.payment.id);
      setPaymentMemo(j.payment.memo ?? null);
      setPaymentTonAmount(null);
      setChainStatus("pending");
      setConfirmedTxHash(null);
      setWalletNote(j.vixonpay?.message ?? "Approve the mobile money prompt on your phone.");
      setMbiyoRedirectUrl(null);
      setMbiyoInstructions(null);
      setMbiyoAuthMode(null);
      setMbiyoCollect({ amount: quote.totalUgx, currency: "UGX" });
      setStep("mbiyo_waiting");
    } catch (e) {
      setError(checkoutPaymentErrorMessage(e, "Could not start VixonPay payment"));
    } finally {
      setBusy(false);
    }
  }

  async function startGuestRelworx() {
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    if (!studentName.trim()) {
      setError("Enter your full name.");
      return;
    }
    const phone = ugandaPhoneToE164(livepayPhone.trim());
    if (!phone) {
      setError("Enter a valid Uganda mobile number (e.g. 0777123456 or +256777123456).");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        name: studentName.trim(),
        email: studentEmail.trim() || "",
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
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        error?: string;
        checkoutToken?: string;
        payment?: { id: string; studentId?: string; memo?: string | null };
        relworx?: { message?: string };
      };
      if (!r.ok) throw new Error(j.error ?? "Could not start Relworx payment");
      if (!j.payment?.id) throw new Error("Invalid Relworx response");
      if (j.checkoutToken) setCheckoutToken(orgSlug, j.checkoutToken);
      if (j.payment.studentId) setCheckoutStudentId(j.payment.studentId);
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
      setError(checkoutPaymentErrorMessage(e, "Could not start Relworx payment"));
    } finally {
      setBusy(false);
    }
  }

  async function startOpenPayCardCheckout() {
    setError(null);
    if (!quote) {
      setError("Load quote first.");
      return;
    }
    if (!studentName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!openPayCardCanPay || openPayCardBalanceUgx < quote.totalUgx) {
      setError("Insufficient OpenPayGB card balance. Fund your card on the student portal first.");
      return;
    }
    setBusy(true);
    try {
      let sid = checkoutStudentId;
      if (!sid) {
        const rs = await fetch("/api/public/checkout/student", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
          credentials: "include",
          body: JSON.stringify({
            organizationSlug: orgSlug,
            name: studentName,
            email: studentEmail || undefined,
            programmeCode: code,
            year,
            semester,
          }),
        });
        const sj = await rs.json();
        if (!rs.ok) throw new Error(sj.error ?? "Student create failed");
        sid = sj.student.id as string;
        setCheckoutStudentId(sid);
        if (typeof sj.checkoutToken === "string") setCheckoutToken(orgSlug, sj.checkoutToken);
      }
      const body: Record<string, unknown> = {
        organizationSlug: orgSlug,
        studentId: sid,
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
        headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
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
          headers: { "Content-Type": "application/json", ...checkoutAuthHeaders(orgSlug) },
          credentials: "include",
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
      setWalletNote(checkoutPaymentErrorMessage(e, "Wallet action cancelled or failed."));
    } finally {
      setBusy(false);
    }
  }

  function resetFlow() {
    setStep("landing");
    setQuote(null);
    setFeeSelectionMode("semester");
    setInstallmentCount(1);
    setSelectedFeeIds([]);
    setPaymentId(null);
    setPaymentMemo(null);
    setPaymentTonAmount(null);
    setChainStatus("pending");
    setConfirmedTxHash(null);
    setStudentName("");
    setStudentEmail("");
    setWalletNote(null);
    setError(null);
    setGetStartedOpen(false);
    setPayChannel(null);
    setMbiyoCountryCode("SN");
    setMbiyoNetwork("orange");
    setMbiyoPhone("");
    setMbiyoCurrency("XOF");
    setMbiyoOmOtp("");
    setMbiyoRedirectUrl(null);
    setMbiyoInstructions(null);
    setMbiyoAuthMode(null);
    setMbiyoCollect(null);
  }

  useEffect(() => {
    if (!getStartedOpen) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setGetStartedOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [getStartedOpen]);

  const shell = (
    <div className="mx-auto min-h-[70vh] max-w-lg px-4 pb-16 pt-6 sm:max-w-xl">
      {insufficientFundsRail ? (
        <InsufficientFundsTopupCallout
          rail={insufficientFundsRail}
          returnPath={pathname ?? undefined}
          className="mb-4"
        />
      ) : error ? (
        <p className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}

      {needsCheckoutSession && checkoutStudentId ? (
        <ResumeCheckoutEmailGate
          resumeEmail={resumeEmail}
          onResumeEmailChange={setResumeEmail}
          busy={busy}
          onVerify={() => void claimCheckoutSession()}
        />
      ) : null}

      <TuitionCheckoutStepper step={step} payChannel={payChannel} />

      {checkoutStudentId && studentName.trim() && !needsCheckoutSession && step !== "landing" ? (
        <GuestWelcomeBanner
          studentId={checkoutStudentId}
          studentName={studentName}
          className="mb-4"
        />
      ) : null}

      {step !== "landing" ? (
        <SchoolCheckoutBanner
          organizationName={displayName}
          organizationSlug={orgSlug}
          className="mb-4"
        />
      ) : null}

      {step === "landing" && (
        <>
          <div className="space-y-8 text-center">
            <header className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="shrink-0 text-center text-sm font-semibold tracking-tight text-cyan-200 sm:text-left">
                {displayName}
              </span>
              <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-slate-200 sm:justify-end">
                <button type="button" onClick={() => window.scrollTo({ top: 0 })} className="hover:text-white">
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => setStep("select_programme")}
                  className="text-cyan-200/95 hover:text-cyan-100"
                >
                  Programmes
                </button>
                <Link href="/student/login" className="hover:text-white">
                  Student portal
                </Link>
                <Link href="/?hub=tuition" className="hover:text-white">
                  Contact
                </Link>
              </nav>
            </header>
            <div className="space-y-4 pt-4">
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                {displayName === "ODEL HUB" ? "ODEL HUB Tuition Program" : `${displayName} — Tuition`}
              </h1>
              <p className="text-lg text-slate-300">
                Pay tuition with TON on-chain or {mobileMoneyRailsLabel} mobile money ({OPEN_PAY_BRAND} brand) at the same
                quoted totals.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep("select_programme")}
                  className="w-full min-h-[48px] rounded-xl border-2 border-cyan-400/70 bg-cyan-500/15 px-8 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)] hover:border-cyan-300 hover:bg-cyan-500/25 sm:w-auto sm:min-w-[10.5rem] sm:min-h-0"
                >
                  Programmes
                </button>
                <button
                  type="button"
                  onClick={() => setGetStartedOpen(true)}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 sm:w-auto sm:min-w-[10.5rem] sm:min-h-0"
                >
                  Get Started
                </button>
                <a
                  href="#how-it-works"
                  className="w-full min-h-[48px] rounded-xl border border-white/20 bg-white/[0.06] px-8 py-3 text-sm font-semibold text-white hover:border-cyan-400/40 inline-flex items-center justify-center sm:w-auto sm:min-w-[10.5rem] sm:min-h-0"
                >
                  How It Works
                </a>
              </div>
              <p className="text-center text-xs text-slate-500">
                <span className="font-medium text-slate-400">Programmes</span> opens guest checkout — no modal, straight to programme selection.
              </p>
            </div>
            {balance && checkoutStudentId && !needsCheckoutSession ? (
              <TuitionBalancePanel
                balance={balance}
                busy={busy}
                onPayInstallment={(plan) => void payResumeInstallmentGuest(plan)}
              />
            ) : null}
            <RequestSchoolWorkspaceCta className="text-left" />
            <section id="how-it-works" className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-left">
              <h2 className="text-sm font-semibold text-slate-200">How it works</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-400">
                <li>
                  <strong className="text-slate-300">School</strong> — you are paying at{" "}
                  <span className="text-cyan-200/90">{displayName}</span> (
                  <span className="font-mono text-slate-500">{orgSlug}</span>). Change school from{" "}
                  <Link href="/pay" className="text-cyan-400 hover:underline">
                    /pay
                  </Link>
                  .
                </li>
                <li>
                  <strong className="text-slate-300">Programme</strong> — choose track, code, year, and semester.
                </li>
                <li>
                  <strong className="text-slate-300">Fees</strong> — semester or full year, pick fee lines, enter your name,
                  review UGX total and TON estimate.
                </li>
                <li>
                  <strong className="text-slate-300">Method</strong> — TON Connect or {mobileMoneyRailsLabel} ({OPEN_PAY_BRAND}; same
                  quote).
                </li>
                <li>
                  <strong className="text-slate-300">Pay</strong> — wallet connect + on-chain note, or approve UGX on your
                  phone.
                </li>
                <li>
                  <strong className="text-slate-300">Done</strong> — we confirm; download your receipt.
                </li>
              </ol>
              <p className="mt-3 text-[11px] text-slate-600">
                A progress bar appears at the top once you leave this page (Programme → Fees → Method → Pay → Done).
              </p>
            </section>
          </div>

          {getStartedOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
              role="presentation"
              onClick={() => setGetStartedOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="get-started-title"
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c1524] p-6 shadow-2xl sm:max-w-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="get-started-title" className="text-center text-lg font-semibold text-white">
                  Get started
                </h2>
                <p className="mt-2 text-center text-sm text-slate-400">
                  Pick student portal sign-in, or pay tuition here with {withMobileMoneyRails("TON")}.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Link
                    href="/student/login"
                    onClick={() => setGetStartedOpen(false)}
                    className="flex flex-col rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-500/15 to-sky-600/10 p-5 text-left transition hover:border-cyan-400/55 hover:brightness-105"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200/90">Student portal</span>
                    <span className="mt-2 text-base font-semibold text-white">Sign in or register</span>
                    <span className="mt-2 text-sm text-slate-400">Use your school account, Google, or portal password.</span>
                    <span className="mt-4 text-sm font-semibold text-cyan-200">Open portal →</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setGetStartedOpen(false);
                      setStep("select_programme");
                    }}
                    className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left transition hover:border-slate-500/80 hover:bg-[var(--card)]/90"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Programmes</span>
                    <span className="mt-2 text-base font-semibold text-white">Pay tuition ({withMobileMoneyRails("TON")})</span>
                    <span className="mt-2 text-sm text-slate-400">Choose your programme, review fees, then pick TON or mobile money.</span>
                    <span className="mt-4 text-sm font-semibold text-white">Continue →</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setGetStartedOpen(false)}
                  className="mt-6 w-full rounded-lg border border-white/15 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {step === "select_programme" && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep("landing")}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Select Programme</h1>
            <p className="mt-1 text-sm text-slate-400">Choose your program to continue</p>
          </div>
          {programmes.length === 0 ? (
            <p className="text-sm text-amber-300">
              No programmes in database. Run <code className="rounded bg-black/40 px-1">npm run seed</code>.
            </p>
          ) : (
            <>
              <div className="space-y-10">
                {(
                  [
                    { tr: PROGRAMME_TRACK_INSERVICE, rows: inserviceRows },
                    { tr: PROGRAMME_TRACK_REGULAR, rows: regularRows },
                  ] as const
                ).map((section) => (
                  <section key={section.tr} className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-200/85">
                      {PROGRAMME_TRACK_LABEL[section.tr]}
                    </h2>
                    {section.rows.length === 0 ? (
                      <p className="text-sm text-slate-600">No programmes in this track.</p>
                    ) : (
                      <ul
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                        role="list"
                        aria-label={`Programmes — ${PROGRAMME_TRACK_LABEL[section.tr]}`}
                      >
                        {section.rows.map((p) => {
                          const selected = code === p.code;
                          return (
                            <li key={p.id} className="min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setCode(p.code);
                                  setQuote(null);
                                  setSelectedFeeIds([]);
                                }}
                                aria-pressed={selected}
                                className={`group relative flex min-h-[9.5rem] w-full flex-col rounded-2xl border p-5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.28)] transition-[border,box-shadow,background-color] ${
                                  selected
                                    ? "border-cyan-400/75 bg-cyan-950/45 ring-2 ring-cyan-400/50 shadow-cyan-900/25"
                                    : "border-[var(--border)] bg-[var(--card)]/95 hover:border-slate-500/80 hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
                                }`}
                              >
                                <span className="inline-flex w-fit items-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-100">
                                  {p.code}
                                </span>
                                <span className="mt-3 text-base font-semibold leading-snug text-white line-clamp-3">
                                  {p.name}
                                </span>
                                <span className="mt-auto pt-4 text-xs font-medium text-slate-500 group-hover:text-slate-400">
                                  {selected ? "Selected · continue below" : "Tap to select"}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
              {selectedProgramme ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/90 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Selected programme</p>
                  <p className="mt-1 text-base font-semibold text-white">{selectedProgramme.name}</p>
                  <p className="mt-0.5 text-xs text-cyan-200/90">
                    {PROGRAMME_TRACK_LABEL[selectedProgramme.track]} · {selectedProgramme.code}
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Year</label>
                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(Number(e.target.value));
                      setQuote(null);
                      setSelectedFeeIds([]);
                    }}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">{periodLabels.periodPickerLabel}</label>
                  <select
                    value={semester}
                    onChange={(e) => {
                      setSemester(Number(e.target.value));
                      setQuote(null);
                      setSelectedFeeIds([]);
                    }}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                  >
                    {periodOptions.map((s) => (
                      <option key={s} value={s}>
                        {periodLabels.periodOption(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onContinueFromProgramme()}
                disabled={busy || !code}
                className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                Continue
              </button>
            </>
          )}
        </div>
      )}

      {step === "fees_breakdown" && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => {
              setQuote(null);
              setSelectedFeeIds([]);
              setCoveragePreview({ semester: null, year: null, programme: null });
              setStep("select_programme");
            }}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>

          {!quote ? (
            <div className="rounded-xl border border-slate-600/50 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-400">
              {busy ? "Loading fee schedule…" : "Could not load fees. Go back and try again."}
            </div>
          ) : (
            <PayFeesBreakdown
              quote={quote}
              year={year}
              semester={semester}
              busy={busy}
              selectedFeeIds={selectedFeeIds}
              studentName={studentName}
              studentEmail={studentEmail}
              coveragePreview={coveragePreview}
              periodLabels={periodLabels}
              onStudentName={setStudentName}
              onStudentEmail={setStudentEmail}
              onCoverageMode={(mode) => void setCoverageMode(mode)}
              onToggleFee={toggleFeeLine}
              onSelectAll={selectAllFeeLines}
              installmentCount={installmentCount}
              onInstallmentCountChange={(c) => void onInstallmentCountChange(c)}
              onContinue={() => setStep("choose_pay_method")}
            />
          )}
        </div>
      )}

      {step === "choose_pay_method" && quote && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep("fees_breakdown")}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Choose how to pay</h1>
            <p className="mt-2 text-sm text-slate-400">
              Total due{" "}
              <span className="font-semibold text-white">UGX {quote.totalUgx.toLocaleString()}</span> (includes processing
              where configured). Same quote for TON, {PAYMENT_RAIL_MBIYO}, or {PAYMENT_RAIL_LIVEPAY}.
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/85">TON Connect</p>
              <p className="mt-1 text-sm text-slate-400">
                Pay ~{quote.tonAmount} TON from your wallet. Best if you already hold TON.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void createStudentAndTonPayment()}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
              >
                Continue with TON
              </button>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{mbiyoRailSectionLabel}</p>
              <p className="mt-1 text-sm text-slate-400">
                Approve the mobile-money amount on your phone. Use the SIM or wallet app for the network you select.
              </p>
              <div className="mt-4">
                <MbiyoPayinFields
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
              <button
                type="button"
                disabled={busy}
                onClick={() => void startGuestMbiyo()}
                className="mt-4 w-full rounded-xl border border-white/15 bg-white/[0.08] py-3 text-sm font-semibold text-white hover:bg-white/[0.12] disabled:opacity-50"
              >
                Start {PAYMENT_RAIL_MBIYO}
              </button>
            </div>
            {openPayCardPlatformEnabled ? (
              <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/85">
                  {openPayCardRailSectionLabel}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Pay UGX {quote.totalUgx.toLocaleString()} from your platform card balance (UGX{" "}
                  {openPayCardBalanceUgx.toLocaleString()} available).
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={useOpenPayCardAtCheckout}
                    onChange={(e) => setUseOpenPayCardAtCheckout(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  Pay tuition with {PAYMENT_RAIL_OPENPAY_CARD}
                </label>
                {useOpenPayCardAtCheckout ? (
                  <button
                    type="button"
                    disabled={busy || openPayCardBalanceUgx < quote.totalUgx}
                    onClick={() => void startOpenPayCardCheckout()}
                    className="mt-4 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    Pay UGX {quote.totalUgx.toLocaleString()} from card
                  </button>
                ) : null}
              </div>
            ) : null}
            {livepayEnabled ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/85">{livepayRailSectionLabel}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Pay UGX {quote.totalUgx.toLocaleString()} via MTN or Airtel mobile money in Uganda.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-500">Network</label>
                    <select
                      value={livepayNetwork}
                      onChange={(e) => setLivepayNetwork(e.target.value as "mtn" | "airtel")}
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                    >
                      <option value="mtn">MTN</option>
                      <option value="airtel">Airtel</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Phone</label>
                    <input
                      value={livepayPhone}
                      onChange={(e) => setLivepayPhone(e.target.value)}
                      placeholder="0777123456"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startGuestLivepay()}
                  className="mt-4 w-full rounded-xl border border-emerald-500/40 bg-emerald-600/90 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Pay with {PAYMENT_RAIL_LIVEPAY}
                </button>
              </div>
            ) : null}
            {vixonpayEnabled ? (
              <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/85">{vixonpayRailSectionLabel}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Pay UGX {quote.totalUgx.toLocaleString()} via VixonPay mobile money (Uganda MTN/Airtel).
                </p>
                <div className="mt-4">
                  <label className="text-xs font-medium text-slate-500">Phone</label>
                  <input
                    value={livepayPhone}
                    onChange={(e) => setLivepayPhone(e.target.value)}
                    placeholder="0777123456"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startGuestVixonpay()}
                  className="mt-4 w-full rounded-xl border border-violet-500/40 bg-violet-600/90 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  Pay with {PAYMENT_RAIL_VIXONPAY}
                </button>
              </div>
            ) : null}
            {relworxEnabled ? (
              <div className="rounded-xl border border-sky-500/25 bg-sky-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-200/85">{relworxRailSectionLabel}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Pay UGX {quote.totalUgx.toLocaleString()} via Relworx mobile money (Uganda MTN/Airtel).
                </p>
                <div className="mt-4">
                  <label className="text-xs font-medium text-slate-500">Phone</label>
                  <input
                    value={livepayPhone}
                    onChange={(e) => setLivepayPhone(e.target.value)}
                    placeholder="0777123456"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startGuestRelworx()}
                  className="mt-4 w-full rounded-xl border border-sky-500/40 bg-sky-600/90 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  Pay with {PAYMENT_RAIL_RELWORX}
                </button>
              </div>
            ) : null}
          </div>
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
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Change method
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Complete on your phone</h1>
            <p className="mt-2 text-sm text-slate-400">
              {payChannel === "livepay" ? (
                <>
                  Approve{" "}
                  <span className="font-semibold text-white">
                    UGX {quote.totalUgx.toLocaleString()}
                  </span>{" "}
                  on your {livepayNetwork === "airtel" ? "Airtel Money" : "MTN Mobile Money"} handset via{" "}
                  {PAYMENT_RAIL_LIVEPAY}. {walletNote ? `${walletNote} ` : ""}
                  This page updates automatically when LivePay confirms the payment.
                </>
              ) : payChannel === "vixonpay" || payChannel === "relworx" ? (
                <>
                  Approve{" "}
                  <span className="font-semibold text-white">
                    UGX {quote.totalUgx.toLocaleString()}
                  </span>{" "}
                  on your handset via{" "}
                  {payChannel === "vixonpay" ? PAYMENT_RAIL_VIXONPAY : PAYMENT_RAIL_RELWORX}.{" "}
                  {walletNote ? `${walletNote} ` : ""}
                  This page updates automatically when your payment confirms.
                </>
              ) : mbiyoCollect ? (
                <>
                  Approve{" "}
                  <span className="font-semibold text-white">
                    {mbiyoCollect.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {mbiyoCollect.currency}
                  </span>{" "}
                  on your handset (quoted tuition recorded as UGX {quote.totalUgx.toLocaleString()}).{" "}
                  {PAYMENT_RAIL_MBIYO}
                  uses your country&apos;s wallet currency for collection.
                </>
              ) : (
                <>
                  Pay tuition with {PAYMENT_RAIL_MBIYO} ({OPEN_PAY_BRAND}). Quote (UGX {quote.totalUgx.toLocaleString()}) converts at
                  collection time.
                </>
              )}{" "}
              {payChannel !== "livepay" && payChannel !== "vixonpay" && payChannel !== "relworx" ? (
                <>Approve the USSD or in-app prompt. This page updates when the payment confirms.</>
              ) : null}
            </p>
          </div>
          {mbiyoRedirectUrl ? (
            <a
              href={mbiyoRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110"
            >
              Open payment link
            </a>
          ) : null}
          {mbiyoInstructions ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left text-sm text-slate-200 whitespace-pre-wrap">
              {mbiyoInstructions}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Follow the prompt on your handset if no extra instructions appear here.
            </p>
          )}
          {mbiyoAuthMode ? (
            <p className="text-xs text-slate-600">
              Operator auth mode: <span className="font-mono text-slate-400">{mbiyoAuthMode}</span>
            </p>
          ) : null}
          <div className="flex flex-col items-center py-6">
            <div
              className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400"
              aria-hidden
            />
            <p className="mt-4 text-xs text-slate-500">Waiting for confirmation…</p>
          </div>
        </div>
      )}

      {step === "connect_wallet" && paymentId && quote && (
        <div className="space-y-6 text-center">
          <button
            type="button"
            onClick={() => {
              setPaymentId(null);
              setPayChannel(null);
              setStep("fees_breakdown");
            }}
            className="block text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>
          {checkoutStudentId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelCurrentPendingPayment()}
              className="block text-sm text-rose-400 hover:text-rose-300 disabled:opacity-50"
            >
              Cancel pending payment
            </button>
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold text-white">Connect Your Wallet</h1>
            <p className="mt-1 text-sm text-slate-400">Use TON Connect with Tonkeeper, MyTonWallet, OpenMask, or Telegram.</p>
          </div>
          <div className="flex justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
            <TonConnectButton />
          </div>
          {wallet ? (
            <p className="text-xs text-emerald-300/90">Connected: {abbrevMiddle(wallet.account.address, 6, 4)}</p>
          ) : null}
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-left text-xs leading-relaxed text-amber-100/95">
            <p className="font-semibold text-amber-200">If connection fails on this PC</p>
            <p className="mt-1 text-amber-100/80">
              &quot;scheme does not have a registered handler&quot; means Tonkeeper desktop is not installed. Use
              Wallet in Telegram, scan QR with Tonkeeper mobile, or go back and pay with {mobileMoneyRailsLabel}.
            </p>
          </div>
          <TonConnectDevBridgeNotice className="mt-2" />
          <p className="text-xs text-slate-500">Scan the QR or pick Telegram / a browser extension wallet in the modal.</p>
          <div className="flex flex-wrap justify-center gap-3 text-xs font-medium text-slate-500">
            <span>Tonkeeper</span>
            <span>·</span>
            <span>MyTonWallet</span>
            <span>·</span>
            <span>OpenMask</span>
            <span>·</span>
            <span>Telegram</span>
          </div>
          <button
            type="button"
            onClick={() => setStep("confirm_payment")}
            disabled={!wallet?.account?.address?.trim()}
            className="w-full rounded-xl border border-white/15 bg-white/[0.08] py-3 text-sm font-semibold text-white hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to confirm payment
          </button>
          {!wallet?.account?.address?.trim() ? (
            <p className="text-xs text-slate-500">Connect a wallet above to continue.</p>
          ) : null}
        </div>
      )}

      {step === "confirm_payment" && paymentId && quote && (
        <div className="space-y-6">
          <button type="button" onClick={() => setStep("connect_wallet")} className="text-sm text-slate-400 hover:text-white">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Confirm Payment</h1>
            <p className="mt-1 text-sm text-slate-400">Check amount, destination, and note before sending.</p>
          </div>
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Amount</span>
              <span className="font-semibold text-white">
                {tonDisplay} TON <span className="font-normal text-slate-500">≈ UGX {quote.totalUgx.toLocaleString()}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-500">To address</span>
              <p className="mt-1 break-all font-mono text-xs text-cyan-100/90">{abbrevMiddle(quote.destinationWallet, 6, 4)}</p>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{quote.destinationWallet}</p>
            </div>
            {paymentMemo ? (
              <div>
                <span className="text-slate-500">Note (on-chain comment)</span>
                <p className="mt-1 break-words font-mono text-xs text-amber-200/90">{paymentMemo}</p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void sendTonWithWallet()}
            disabled={busy || !wallet?.account?.address?.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
          >
            Confirm &amp; Pay
          </button>
          {walletNote && !insufficientFundsRail ? (
            <p className="text-center text-xs text-rose-300">{walletNote}</p>
          ) : null}
        </div>
      )}

      {step === "processing" && paymentId && quote && (
        <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-white">Payment Processing</h1>
          <p className="max-w-sm text-sm text-slate-400">
            Please wait while we confirm your TON transfer… This may take a few seconds.
          </p>
          <div
            className="h-14 w-14 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400"
            aria-hidden
          />
          <p className="text-xs text-slate-500">Checking on-chain status…</p>
        </div>
      )}

      {step === "success" && paymentId && quote && (
        <div className="space-y-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Payment Successful!</h1>
            <p className="mt-2 text-sm text-slate-400">
              {payChannel === "openpay_card" ? (
                <>
                  Your payment of{" "}
                  <span className="font-semibold text-cyan-100">UGX {quote.totalUgx.toLocaleString()}</span> via{" "}
                  {PAYMENT_RAIL_OPENPAY_CARD} has been confirmed.
                </>
              ) : payChannel === "mbiyo" || payChannel === "livepay" || payChannel === "relworx" || payChannel === "vixonpay" ? (
                <>
                  Your payment of{" "}
                  <span className="font-semibold text-cyan-100">UGX {quote.totalUgx.toLocaleString()}</span> via{" "}
                  {payChannel === "livepay"
                    ? PAYMENT_RAIL_LIVEPAY
                    : payChannel === "relworx"
                      ? PAYMENT_RAIL_RELWORX
                      : payChannel === "vixonpay"
                        ? PAYMENT_RAIL_VIXONPAY
                        : PAYMENT_RAIL_MBIYO}{" "}
                  has been confirmed.
                </>
              ) : (
                <>
                  Your payment of <span className="font-semibold text-cyan-100">{tonDisplay} TON</span> has been confirmed.
                </>
              )}
            </p>
          </div>
          {confirmedTxHash ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <p className="text-xs text-slate-500">Transaction</p>
              <p className="mt-1 font-mono text-sm text-sky-200">{abbrevMiddle(confirmedTxHash, 4, 4)}</p>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{confirmedTxHash}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {(() => {
              const receiptQs = receiptAccessToken
                ? `?t=${encodeURIComponent(receiptAccessToken)}`
                : "";
              return (
                <>
            <a
              href={`/api/receipts/${paymentId}/pdf${receiptQs}`}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110"
            >
              Download Receipt
            </a>
            <Link
              href={`/receipt/${paymentId}${receiptQs}`}
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              View receipt page
            </Link>
                </>
              );
            })()}
            <Link
              href={
                studentEmail.trim()
                  ? `/student/claim?org=${encodeURIComponent(orgSlug)}&email=${encodeURIComponent(studentEmail.trim())}`
                  : `/student/claim?org=${encodeURIComponent(orgSlug)}`
              }
              className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-6 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-900/50"
            >
              Open student dashboard
            </Link>
          </div>
          {studentEmail.trim() ? (
            <p className="text-center text-xs leading-relaxed text-slate-400">
              Paid as a guest? Use <strong className="text-slate-300">Open student dashboard</strong> with the same
              email ({studentEmail.trim()}) to set a portal password and see receipts. Already registered?{" "}
              <Link href="/student/login" className="text-sky-400 hover:underline">
                Sign in
              </Link>
              .
            </p>
          ) : (
            <p className="text-center text-xs text-slate-500">
              Enter your email at checkout to claim your portal account after payment.
            </p>
          )}
          <button type="button" onClick={resetFlow} className="text-xs text-slate-500 underline hover:text-slate-300">
            Pay another programme
          </button>
        </div>
      )}
    </div>
  );

  return shell;
}
