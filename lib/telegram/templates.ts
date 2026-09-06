import { escapeHtml } from "@/lib/telegram/escape";
import { getTmaAppUrl } from "@/lib/telegram/tma-url";
import { absoluteUrl } from "@/lib/public-url";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

export type PaymentConfirmedTemplateOpts = {
  programmeCode: string;
  year: number;
  semester: number;
  tonAmount: number;
  totalUgx?: number;
  txHash?: string | null;
  receiptUrl: string;
  progressLine?: string;
  completionBanner?: string;
  periodLine?: string;
};

export function paymentConfirmedMessage(opts: PaymentConfirmedTemplateOpts): string {
  const period =
    opts.periodLine ??
    `${escapeHtml(opts.programmeCode)} · Year ${opts.year} · Sem ${opts.semester}`;
  const ugxLine =
    opts.totalUgx && opts.totalUgx > 0
      ? `\n<b>UGX ${opts.totalUgx.toLocaleString()}</b>`
      : "";
  return [
    "✅ <b>Payment confirmed</b>",
    "",
    period,
    `<b>${opts.tonAmount} TON</b>${ugxLine}`,
    opts.progressLine ?? "",
    opts.txHash ? `\n<code>${escapeHtml(opts.txHash)}</code>` : "",
    opts.receiptUrl.startsWith("http")
      ? `\n<a href="${escapeHtml(opts.receiptUrl)}">View receipt</a>`
      : "",
    `\n<a href="${escapeHtml(getTmaAppUrl("history"))}">Open in Mini App</a>`,
    opts.completionBanner ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type CardTopupTemplateOpts = {
  amountUgx: number;
  newBalanceUgx: number;
  maskedPan?: string;
  studentName: string;
};

export function cardTopupMessage(opts: CardTopupTemplateOpts): string {
  return [
    `💳 <b>${OPEN_PAY_BRAND} card topped up</b>`,
    "",
    `<b>${escapeHtml(opts.studentName)}</b>`,
    `Amount: <b>UGX ${opts.amountUgx.toLocaleString()}</b>`,
    `New balance: <b>UGX ${opts.newBalanceUgx.toLocaleString()}</b>`,
    opts.maskedPan ? `Card: <code>${escapeHtml(opts.maskedPan)}</code>` : "",
    `\n<a href="${escapeHtml(getTmaAppUrl("card"))}">Open card in Mini App</a>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type TuitionDueTemplateOpts = {
  studentName: string;
  organizationName: string;
  programmeCode: string;
  outstandingUgx: number;
  installmentLabel?: string;
  installmentUgx?: number;
};

export function tuitionDueReminderMessage(opts: TuitionDueTemplateOpts): string {
  const lines = [
    "⏰ <b>Tuition reminder</b>",
    "",
    `Hi ${escapeHtml(opts.studentName)},`,
    `${escapeHtml(opts.organizationName)} · ${escapeHtml(opts.programmeCode)}`,
    `Outstanding: <b>UGX ${opts.outstandingUgx.toLocaleString()}</b>`,
  ];
  if (opts.installmentLabel && opts.installmentUgx) {
    lines.push(`Next: ${escapeHtml(opts.installmentLabel)} — UGX ${opts.installmentUgx.toLocaleString()}`);
  }
  lines.push(
    "",
    `<a href="${escapeHtml(getTmaAppUrl("pay"))}">Pay now in Mini App</a>`,
    `<a href="${escapeHtml(absoluteUrl("/tma"))}">Open ODELPay HUB Pay</a>`,
  );
  return lines.join("\n");
}

export type ReceiptReadyTemplateOpts = {
  receiptId: string;
  studentName: string;
  amountUgx: number;
  methodLabel: string;
  receiptUrl: string;
  pdfUrl: string;
};

export function receiptReadyMessage(opts: ReceiptReadyTemplateOpts): string {
  return [
    "🧾 <b>Receipt ready</b>",
    "",
    `Receipt <code>${escapeHtml(opts.receiptId.slice(-8))}</code>`,
    `<b>${escapeHtml(opts.studentName)}</b>`,
    `Amount: UGX ${opts.amountUgx.toLocaleString()}`,
    `Method: ${escapeHtml(opts.methodLabel)}`,
    `Status: Confirmed`,
    "",
    opts.receiptUrl.startsWith("http")
      ? `<a href="${escapeHtml(opts.receiptUrl)}">View receipt</a>`
      : "",
    opts.pdfUrl.startsWith("http") ? `<a href="${escapeHtml(opts.pdfUrl)}">Download PDF</a>` : "",
    `<a href="${escapeHtml(getTmaAppUrl("history"))}">Mini App history</a>`,
  ]
    .filter(Boolean)
    .join("\n");
}
