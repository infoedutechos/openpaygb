import "server-only";

import { prisma } from "@/lib/prisma";
import { reconcileOpgbWalletWithCard } from "@/lib/opgb-ledger";
import { requestOpgbWithdraw } from "@/lib/opgb-withdraw";

/**
 * Debit OpenPayGB card UGX and queue a Mobile Money cashout (OPGB withdraw).
 * Wallet is synced to card balance first; withdraw debits wallet; card is decremented to match.
 */
export async function cashoutOpenPayCardToMomo(opts: {
  studentId: string;
  organizationId: string;
  amountUgx: number;
  phone: string;
  network?: "MTN" | "AIRTEL";
  memo?: string;
}): Promise<
  | { ok: true; requestId: string; referenceKey: string; message: string }
  | { ok: false; error: string; status: number }
> {
  const amountUgx = Math.round(opts.amountUgx);
  if (amountUgx < 1000) {
    return { ok: false, error: "Minimum cashout is UGX 1,000", status: 400 };
  }
  const phone = opts.phone.trim();
  if (phone.length < 9) {
    return { ok: false, error: "Enter a valid Mobile Money number", status: 400 };
  }

  const card = await prisma.openPayCard.findUnique({ where: { studentId: opts.studentId } });
  if (!card || card.status !== "active") {
    return { ok: false, error: "Activate your OpenPayGB card first", status: 409 };
  }
  if (card.blocked) {
    return { ok: false, error: "Card is blocked — unblock it before cashing out", status: 403 };
  }
  if (card.balanceUgx < amountUgx) {
    return { ok: false, error: "Insufficient card balance", status: 400 };
  }

  await reconcileOpgbWalletWithCard({
    studentId: opts.studentId,
    organizationId: opts.organizationId,
    cardBalanceUgx: card.balanceUgx,
  });

  const result = await requestOpgbWithdraw({
    studentId: opts.studentId,
    organizationId: opts.organizationId,
    asset: "opgb",
    amount: amountUgx,
    rail: "momo",
    destination: phone,
    memo: opts.memo ?? `OPGB card → MoMo${opts.network ? ` (${opts.network})` : ""}`,
  });

  if (!result.ok) return result;

  await prisma.openPayCard.update({
    where: { id: card.id },
    data: { balanceUgx: { decrement: amountUgx } },
  });

  return {
    ok: true,
    requestId: result.requestId,
    referenceKey: result.referenceKey,
    message: result.message || "Cashout queued — Mobile Money payout is processing.",
  };
}

export async function setOpenPayCardBlocked(opts: {
  studentId: string;
  blocked: boolean;
}): Promise<{ ok: true; blocked: boolean } | { ok: false; error: string; status: number }> {
  const card = await prisma.openPayCard.findUnique({ where: { studentId: opts.studentId } });
  if (!card) return { ok: false, error: "Card not found", status: 404 };
  if (card.status !== "active" && opts.blocked) {
    return { ok: false, error: "Only active cards can be blocked", status: 409 };
  }
  await prisma.openPayCard.update({
    where: { id: card.id },
    data: { blocked: opts.blocked },
  });
  return { ok: true, blocked: opts.blocked };
}
