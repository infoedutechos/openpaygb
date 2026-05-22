import { createHmac, timingSafeEqual } from "node:crypto";
import type { MobileMoneyProvider, Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { extractFirstField, extractField, isSuccessStatus } from "@/lib/mobile-money-parse";
import { findPaymentByMomoReference } from "@/lib/momo/find-payment";
import { isProductionRuntime } from "@/lib/production-secrets";

export function verifyProviderWebhookAuth(
  provider: Pick<MobileMoneyProvider, "authKind" | "webhookSecret" | "webhookHeaderName">,
  req: Request,
  rawBody: string,
): boolean {
  const secret = provider.webhookSecret.trim();
  if (!secret) return !isProductionRuntime();

  if (provider.authKind === "hmac_sha256_body") {
    const headerRaw =
      req.headers.get("Signature") ??
      req.headers.get("signature") ??
      req.headers.get("X-Signature") ??
      req.headers.get("x-signature") ??
      "";
    const header = headerRaw.replace(/^sha256=/i, "").trim();
    if (!header) return false;
    const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    try {
      const expectedBuf = Buffer.from(expectedHex, "hex");
      const gotBuf = Buffer.from(header, "hex");
      if (expectedBuf.length !== gotBuf.length || expectedBuf.length === 0) return false;
      return timingSafeEqual(expectedBuf, gotBuf);
    } catch {
      return false;
    }
  }

  const headerName = provider.webhookHeaderName.trim() || "x-provider-webhook-secret";
  const got = req.headers.get(headerName) ?? req.headers.get(headerName.toLowerCase()) ?? "";
  return got === secret;
}

export async function confirmPaymentFromProviderWebhook(opts: {
  provider: MobileMoneyProvider;
  body: unknown;
}): Promise<{ action: string; paymentId?: string }> {
  const { provider, body } = opts;

  if (!isSuccessStatus(body, provider.statusField, provider.statusSuccessValues)) {
    const st = extractField(body, provider.statusField);
    return { action: "not_success", paymentId: st ?? undefined };
  }

  const paymentId = extractFirstField(body, provider.orderIdFields);
  if (!paymentId) {
    return { action: "no_order_id" };
  }

  let payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) {
    payment = await findPaymentByMomoReference(paymentId);
  }
  if (!payment) {
    return { action: "unknown_payment", paymentId };
  }

  if (provider.organizationId && payment.organizationId !== provider.organizationId) {
    return { action: "org_mismatch", paymentId: payment.id };
  }

  if (payment.status === "confirmed") {
    return { action: "already_confirmed", paymentId: payment.id };
  }

  const txId = extractField(body, provider.transactionIdField) ?? paymentId;

  const n = await prisma.payment.updateMany({
    where: { id: payment.id, status: "pending" },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      momoReference: txId,
    },
  });

  if (n.count === 0) {
    return { action: "already_confirmed", paymentId: payment.id };
  }

  const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  handleFirstTimeConfirmation(updated);
  return { action: "confirmed", paymentId: payment.id };
}

export function paymentToPartnerPayload(payment: Payment & { organization?: { slug: string; name: string } | null }) {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    organizationSlug: payment.organization?.slug ?? null,
    studentId: payment.studentId,
    programmeCode: payment.programmeCode,
    year: payment.year,
    semester: payment.semester,
    totalUgx: payment.totalUgx,
    tonAmount: payment.tonAmount,
    rail: payment.rail,
    status: payment.status,
    memo: payment.memo,
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}
