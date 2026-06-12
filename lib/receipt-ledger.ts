import type { InstitutionTier, PaymentRail, PaymentStatus } from "@prisma/client";
import { receiptYearPeriodLabel } from "@/lib/academic-period";
import { formatFeeKeyLabel } from "@/lib/programme-fee-labels";
import { buildReceiptBreakdown, type ReceiptBreakdown, type ReceiptPaymentLike } from "@/lib/receipt-lines";
import type { ReceiptLedger, ReceiptLedgerRow } from "@/lib/receipt-ledger-types";

export type { ReceiptLedger, ReceiptLedgerRow, ReceiptLedgerRowKind } from "@/lib/receipt-ledger-types";
export { formatLedgerDateDisplay } from "@/lib/receipt-ledger-display";

export type ReceiptLedgerPayment = ReceiptPaymentLike & {
  id: string;
  status: PaymentStatus;
  rail: PaymentRail;
  momoReference?: string | null;
  txHash?: string | null;
  confirmedAt?: Date | null;
  createdAt: Date;
};

function vchNoForPayment(p: ReceiptLedgerPayment): string {
  if (p.momoReference?.trim()) return p.momoReference.trim().slice(0, 12);
  if (p.txHash?.trim()) return p.txHash.trim().slice(0, 12);
  return p.id.slice(-6);
}

function railReceiptLabel(rail: PaymentRail): string {
  switch (rail) {
    case "mbiyo":
      return "Mbiyo / MoMo";
    case "livepay":
      return "LivePay";
    case "momo_bridge":
      return "MoMo";
    case "openpay_card":
      return "OpenPayGB Card";
    case "telegram":
      return "Telegram TON";
    case "web":
      return "TON Web";
    case "relworx":
      return "Relworx";
    case "vixonpay":
      return "VixonPay";
    default:
      return "Receipt";
  }
}

function invoiceRowsFromBreakdown(
  breakdown: ReceiptBreakdown,
  payment: ReceiptLedgerPayment,
  institutionTier?: InstitutionTier | string | null,
): ReceiptLedgerRow[] {
  const date = payment.confirmedAt ?? payment.createdAt;
  return breakdown.lines.map((line) => {
    const period = receiptYearPeriodLabel(line.year, line.semester, institutionTier);
    const particulars = [formatFeeKeyLabel(line.feeKey), line.recurrenceLabel, period].filter(Boolean).join(" — ");
    return {
      kind: "transaction" as const,
      date,
      crDr: "Dr" as const,
      particulars: particulars || line.label,
      vchType: "Invoice",
      vchNo: payment.id.slice(-6),
      debitUgx: line.lineTotalUgx,
      creditUgx: 0,
    };
  });
}

function receiptRowFromPayment(p: ReceiptLedgerPayment, breakdown: ReceiptBreakdown): ReceiptLedgerRow {
  const date = p.confirmedAt ?? p.createdAt;
  const tuitionCredit = breakdown.subtotalUgx;
  const platform = breakdown.platformFeeUgx;
  const particulars =
    platform > 0
      ? `${railReceiptLabel(p.rail)} — tuition UGX ${tuitionCredit.toLocaleString()} + processing ${platform.toLocaleString()}`
      : railReceiptLabel(p.rail);
  return {
    kind: "transaction",
    date,
    crDr: "Cr",
    particulars,
    vchType: "Receipt",
    vchNo: vchNoForPayment(p),
    debitUgx: 0,
    creditUgx: p.totalUgx,
  };
}

export function buildReceiptLedger(input: {
  organizationName: string;
  studentName: string;
  programmeName: string;
  programmeCode: string;
  payments: ReceiptLedgerPayment[];
  programmeFees: Parameters<typeof buildReceiptBreakdown>[1];
  focusPaymentId: string;
  institutionTier?: InstitutionTier | string | null;
}): ReceiptLedger {
  const confirmed = input.payments
    .filter((p) => p.status === "confirmed")
    .sort((a, b) => {
      const ta = (a.confirmedAt ?? a.createdAt).getTime();
      const tb = (b.confirmedAt ?? b.createdAt).getTime();
      return ta - tb;
    });

  const focusIdx = confirmed.findIndex((p) => p.id === input.focusPaymentId);
  const slice = focusIdx >= 0 ? confirmed.slice(0, focusIdx + 1) : confirmed;

  const periodFrom =
    slice.length > 0 ? (slice[0]!.confirmedAt ?? slice[0]!.createdAt) : new Date();
  const last = slice[slice.length - 1];
  const periodTo = last ? (last.confirmedAt ?? last.createdAt) : new Date();

  const rows: ReceiptLedgerRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  rows.push({
    kind: "opening_balance",
    date: null,
    crDr: "",
    particulars: "Opening Balance",
    vchType: "",
    vchNo: "",
    debitUgx: 0,
    creditUgx: 0,
  });

  for (const payment of slice) {
    const breakdown = buildReceiptBreakdown(payment, input.programmeFees, input.institutionTier);
    for (const inv of invoiceRowsFromBreakdown(breakdown, payment, input.institutionTier)) {
      rows.push(inv);
      totalDebit += inv.debitUgx;
    }
    const receipt = receiptRowFromPayment(payment, breakdown);
    rows.push(receipt);
    totalCredit += receipt.creditUgx;
  }

  const closingBalanceUgx = Math.max(0, totalDebit - totalCredit);
  rows.push({
    kind: "closing_balance",
    date: null,
    crDr: "",
    particulars: "Closing Balance",
    vchType: "",
    vchNo: "",
    debitUgx: 0,
    creditUgx: closingBalanceUgx,
  });
  totalCredit += closingBalanceUgx;

  return {
    organizationName: input.organizationName,
    studentName: input.studentName,
    programmeName: input.programmeName,
    programmeCode: input.programmeCode,
    periodFrom,
    periodTo,
    openingBalanceUgx: 0,
    closingBalanceUgx,
    rows,
    totalDebitUgx: totalDebit,
    totalCreditUgx: totalCredit,
  };
}

