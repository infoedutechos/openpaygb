import { createHmac, timingSafeEqual } from "crypto";
import { jwtSecretReceiptBytes } from "@/lib/jwt-secrets";

function receiptSecret(): string {
  const bytes = jwtSecretReceiptBytes();
  if (!bytes) {
    throw new Error("JWT_SECRET_RECEIPT, JWT_SECRET_CHECKOUT, or JWT_SECRET must be set (min 16 chars)");
  }
  return new TextDecoder().decode(bytes);
}

/** HMAC receipt link token — no DB column; derived from payment id, student, and confirm time. */
export function createReceiptAccessToken(payment: {
  id: string;
  studentId: string;
  confirmedAt: Date | null;
}): string | null {
  if (!payment.confirmedAt) return null;
  const payload = `${payment.id}:${payment.studentId}:${payment.confirmedAt.getTime()}`;
  return createHmac("sha256", receiptSecret()).update(payload).digest("base64url");
}

export function verifyReceiptAccessToken(
  payment: { id: string; studentId: string; confirmedAt: Date | null },
  token: string | null | undefined,
): boolean {
  if (!token?.trim() || !payment.confirmedAt) return false;
  const expected = createReceiptAccessToken(payment);
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(token.trim()), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function receiptUrlPath(paymentId: string, token: string): string {
  return `/receipt/${paymentId}?t=${encodeURIComponent(token)}`;
}

export function receiptPdfUrlPath(paymentId: string, token: string): string {
  return `/api/receipts/${paymentId}/pdf?t=${encodeURIComponent(token)}`;
}

/** Confirmed receipts: platform admin, owning student portal, or signed link token. */
export function canAccessConfirmedReceipt(opts: {
  payment: { id: string; studentId: string; status: string; confirmedAt: Date | null };
  token: string | null | undefined;
  isAdmin: boolean;
  studentUserId: string | null;
}): boolean {
  if (opts.payment.status !== "confirmed") return opts.isAdmin;
  if (opts.isAdmin) return true;
  if (opts.studentUserId && opts.studentUserId === opts.payment.studentId) return true;
  return verifyReceiptAccessToken(opts.payment, opts.token);
}
