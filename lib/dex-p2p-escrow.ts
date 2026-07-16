import "server-only";

import { prisma } from "@/lib/prisma";
import { debitOpgb, ensureOpgbWallet, reconcileOpgbWalletWithCard } from "@/lib/opgb-ledger";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { p2pAutoReleaseAt } from "@/lib/dex-p2p-release";

export type P2pOfferSide = "buy" | "sell";
export type P2pAsset = "TON" | "USDT";

const OFFER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function seedDemoP2pOffersIfEmpty() {
  // Never seed fake offers in production / Vercel production.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return;
  }
  const count = await prisma.dexP2pOffer.count({ where: { status: "open" } });
  if (count > 0) return;

  const expiresAt = new Date(Date.now() + OFFER_TTL_MS);
  await prisma.dexP2pOffer.createMany({
    data: [
      {
        side: "sell",
        asset: "TON",
        amount: 2.5,
        priceUgxPerUnit: 372_000,
        totalUgx: 930_000,
        status: "open",
        expiresAt,
      },
      {
        side: "buy",
        asset: "USDT",
        amount: 100,
        priceUgxPerUnit: 3_720,
        totalUgx: 372_000,
        status: "open",
        expiresAt,
      },
    ],
  });
}

export async function listOpenP2pOffers() {
  await seedDemoP2pOffersIfEmpty();
  const now = new Date();
  return prisma.dexP2pOffer.findMany({
    where: { status: "open", expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function p2pEscrowPolicy() {
  return {
    phase: 3,
    autonomous: true,
    settlementAsset: "OPGB",
    peg: { opgbPerUgx: 1 },
    features: ["offer_book", "escrow_hold", "auto_release", "dispute_escalation"],
    shipped: [
      "offer_book",
      "escrow_hold",
      "student_create_offer",
      "auto_release",
      "escrow_release",
      "escrow_cancel",
      "dispute_escalation",
      "master_dispute_resolve",
    ],
    pending: ["on_chain_release", "live_payout_disbursement"],
  };
}

export async function createP2pOffer(opts: {
  makerStudentId: string;
  side: P2pOfferSide;
  asset: P2pAsset;
  amount: number;
  priceUgxPerUnit: number;
}) {
  const totalUgx = Math.round(opts.amount * opts.priceUgxPerUnit);
  if (totalUgx <= 0) throw new Error("Invalid offer");

  return prisma.dexP2pOffer.create({
    data: {
      makerStudentId: opts.makerStudentId,
      side: opts.side,
      asset: opts.asset,
      amount: opts.amount,
      priceUgxPerUnit: opts.priceUgxPerUnit,
      totalUgx,
      expiresAt: new Date(Date.now() + OFFER_TTL_MS),
    },
  });
}

export type EscrowResult =
  | { ok: true; escrowId: string; referenceKey: string; message: string }
  | { ok: false; error: string; status: number };

export async function acceptP2pEscrow(opts: {
  offerId: string;
  takerStudentId: string;
  organizationId: string;
}): Promise<EscrowResult> {
  const offer = await prisma.dexP2pOffer.findUnique({ where: { id: opts.offerId } });
  if (!offer || offer.status !== "open") {
    return { ok: false, error: "Offer not available", status: 404 };
  }
  if (offer.expiresAt < new Date()) {
    await prisma.dexP2pOffer.update({ where: { id: offer.id }, data: { status: "expired" } });
    return { ok: false, error: "Offer expired", status: 410 };
  }
  if (offer.makerStudentId === opts.takerStudentId) {
    return { ok: false, error: "Cannot escrow your own offer", status: 409 };
  }

  const referenceKey = `p2p:${offer.id}:${opts.takerStudentId}`;
  const existing = await prisma.dexP2pEscrow.findUnique({ where: { referenceKey } });
  if (existing) {
    return {
      ok: true,
      escrowId: existing.id,
      referenceKey: existing.referenceKey,
      message: "Escrow already held",
    };
  }

  const card = await getStudentOpenPayCard(opts.takerStudentId);
  if (card && card.balanceUgx > 0) {
    await reconcileOpgbWalletWithCard({
      studentId: opts.takerStudentId,
      organizationId: opts.organizationId,
      cardBalanceUgx: card.balanceUgx,
    });
  }
  await ensureOpgbWallet(opts.takerStudentId, opts.organizationId);

  try {
    const escrow = await prisma.$transaction(async (tx) => {
      const locked = await tx.dexP2pOffer.updateMany({
        where: { id: offer.id, status: "open" },
        data: { status: "matched" },
      });
      if (locked.count !== 1) throw new Error("Offer already taken");

      const debited = await debitOpgb(
        {
          studentId: opts.takerStudentId,
          organizationId: opts.organizationId,
          amountUgx: offer.totalUgx,
          kind: "p2p_escrow_hold",
          referenceKey,
          sourceRail: "dex_p2p",
          memo: `P2P escrow ${offer.asset} offer ${offer.id}`,
        },
        tx,
      );
      if (!debited.ok) throw new Error("Insufficient OPGB balance");

      return tx.dexP2pEscrow.create({
        data: {
          offerId: offer.id,
          takerStudentId: opts.takerStudentId,
          amountUgx: offer.totalUgx,
          status: "held",
          referenceKey,
          autoReleaseAt: p2pAutoReleaseAt(),
        },
      });
    });

    return {
      ok: true,
      escrowId: escrow.id,
      referenceKey: escrow.referenceKey,
      message: `Escrow held: UGX ${offer.totalUgx.toLocaleString()} in OPGB. Platform releases ${offer.asset} when maker confirms.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Escrow failed";
    return { ok: false, error: msg, status: 409 };
  }
}
