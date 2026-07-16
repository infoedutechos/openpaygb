import "server-only";

import { prisma } from "@/lib/prisma";
import { creditOpgb, ensureOpgbWallet } from "@/lib/opgb-ledger";
import { creditOpgbAsset, type OpgbCryptoAsset } from "@/lib/opgb-asset-balance";

const AUTO_RELEASE_MS = 24 * 60 * 60 * 1000;

export type P2pReleaseResult =
  | { ok: true; escrowId: string; message: string }
  | { ok: false; error: string; status: number };

function offerCryptoAsset(asset: string): OpgbCryptoAsset {
  return asset.toLowerCase() as OpgbCryptoAsset;
}

export async function releaseP2pEscrow(opts: {
  escrowId: string;
  actorStudentId: string;
}): Promise<P2pReleaseResult> {
  const escrow = await prisma.dexP2pEscrow.findUnique({
    where: { id: opts.escrowId },
    include: { offer: true, dispute: true },
  });
  if (!escrow || escrow.status !== "held") {
    return { ok: false, error: "Escrow not held", status: 404 };
  }
  if (escrow.dispute?.status === "open") {
    return { ok: false, error: "Escrow is under dispute", status: 409 };
  }

  const offer = escrow.offer;
  const makerId = offer.makerStudentId;
  if (!makerId) {
    return { ok: false, error: "Platform offer — use cancel to refund", status: 409 };
  }
  if (opts.actorStudentId !== makerId && opts.actorStudentId !== escrow.takerStudentId) {
    return { ok: false, error: "Not authorized", status: 403 };
  }

  const maker = await prisma.student.findUnique({
    where: { id: makerId },
    select: { organizationId: true },
  });
  const taker = await prisma.student.findUnique({
    where: { id: escrow.takerStudentId },
    select: { organizationId: true },
  });
  if (!maker || !taker) return { ok: false, error: "Student not found", status: 404 };

  await ensureOpgbWallet(makerId, maker.organizationId);
  await ensureOpgbWallet(escrow.takerStudentId, taker.organizationId);

  const releaseKey = `p2p-release:${escrow.referenceKey}`;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.dexP2pEscrow.updateMany({
        where: { id: escrow.id, status: "held" },
        data: { status: "released", releasedAt: new Date() },
      });
      if (locked.count !== 1) throw new Error("Escrow already settled");

      await creditOpgb(
        {
          studentId: makerId,
          organizationId: maker.organizationId,
          amountUgx: escrow.amountUgx,
          kind: "p2p_escrow_release",
          referenceKey: releaseKey,
          sourceRail: "dex_p2p",
          memo: `P2P release ${offer.asset} offer ${offer.id}`,
        },
        tx,
      );

      const takerWallet = await tx.opgbWallet.findUniqueOrThrow({
        where: { studentId: escrow.takerStudentId },
      });
      await creditOpgbAsset(
        {
          walletId: takerWallet.id,
          asset: offerCryptoAsset(offer.asset),
          amount: offer.amount,
        },
        tx,
      );
    });

    return {
      ok: true,
      escrowId: escrow.id,
      message: `Released: ${offer.amount} ${offer.asset} to buyer; UGX ${escrow.amountUgx.toLocaleString()} to seller.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Release failed";
    return { ok: false, error: msg, status: 409 };
  }
}

export async function cancelP2pEscrow(opts: {
  escrowId: string;
  actorStudentId: string;
}): Promise<P2pReleaseResult> {
  const escrow = await prisma.dexP2pEscrow.findUnique({
    where: { id: opts.escrowId },
    include: { dispute: true },
  });
  if (!escrow || escrow.status !== "held") {
    return { ok: false, error: "Escrow not held", status: 404 };
  }
  if (escrow.takerStudentId !== opts.actorStudentId) {
    return { ok: false, error: "Only buyer can cancel", status: 403 };
  }

  const taker = await prisma.student.findUnique({
    where: { id: escrow.takerStudentId },
    select: { organizationId: true },
  });
  if (!taker) return { ok: false, error: "Student not found", status: 404 };

  const refundKey = `p2p-refund:${escrow.referenceKey}`;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.dexP2pEscrow.updateMany({
        where: { id: escrow.id, status: "held" },
        data: { status: "cancelled", releasedAt: new Date() },
      });
      if (locked.count !== 1) throw new Error("Escrow already settled");

      await creditOpgb(
        {
          studentId: escrow.takerStudentId,
          organizationId: taker.organizationId,
          amountUgx: escrow.amountUgx,
          kind: "p2p_escrow_release",
          referenceKey: refundKey,
          sourceRail: "dex_p2p",
          memo: `P2P refund escrow ${escrow.id}`,
        },
        tx,
      );

      await tx.dexP2pOffer.update({
        where: { id: escrow.offerId },
        data: { status: "open" },
      });
    });

    return { ok: true, escrowId: escrow.id, message: "Escrow cancelled — OPGB refunded to buyer." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cancel failed";
    return { ok: false, error: msg, status: 409 };
  }
}

export async function escalateP2pDispute(opts: {
  escrowId: string;
  escalatedBy: string;
  reason: string;
}) {
  const escrow = await prisma.dexP2pEscrow.findUnique({ where: { id: opts.escrowId } });
  if (!escrow || escrow.status !== "held") {
    return { ok: false as const, error: "Escrow not held", status: 404 };
  }
  if (escrow.takerStudentId !== opts.escalatedBy) {
    const offer = await prisma.dexP2pOffer.findUnique({ where: { id: escrow.offerId } });
    if (offer?.makerStudentId !== opts.escalatedBy) {
      return { ok: false as const, error: "Not authorized", status: 403 };
    }
  }

  const dispute = await prisma.dexP2pDispute.upsert({
    where: { escrowId: escrow.id },
    create: {
      escrowId: escrow.id,
      escalatedBy: opts.escalatedBy,
      reason: opts.reason.trim().slice(0, 500),
      status: "open",
    },
    update: { reason: opts.reason.trim().slice(0, 500) },
  });

  await prisma.dexP2pEscrow.update({
    where: { id: escrow.id },
    data: { status: "disputed" },
  });

  return { ok: true as const, disputeId: dispute.id, message: "Dispute escalated to platform ops." };
}

/** Master ops: resolve open dispute by releasing to seller or refunding buyer. */
export async function resolveP2pDispute(opts: {
  disputeId: string;
  resolution: "release" | "refund";
  note?: string;
}): Promise<P2pReleaseResult & { disputeId?: string }> {
  const dispute = await prisma.dexP2pDispute.findUnique({
    where: { id: opts.disputeId },
    include: { escrow: { include: { offer: true } } },
  });
  if (!dispute || dispute.status !== "open") {
    return { ok: false, error: "Dispute not open", status: 404 };
  }

  const escrow = dispute.escrow;
  if (escrow.status !== "disputed" && escrow.status !== "held") {
    return { ok: false, error: "Escrow already settled", status: 409 };
  }

  const offer = escrow.offer;
  const makerId = offer.makerStudentId;
  const note = opts.note?.trim().slice(0, 500) ?? "";

  if (opts.resolution === "release") {
    if (!makerId) {
      return { ok: false, error: "Platform offer cannot release to maker — use refund", status: 409 };
    }

    const maker = await prisma.student.findUnique({
      where: { id: makerId },
      select: { organizationId: true },
    });
    const taker = await prisma.student.findUnique({
      where: { id: escrow.takerStudentId },
      select: { organizationId: true },
    });
    if (!maker || !taker) return { ok: false, error: "Student not found", status: 404 };

    await ensureOpgbWallet(makerId, maker.organizationId);
    await ensureOpgbWallet(escrow.takerStudentId, taker.organizationId);

    const releaseKey = `p2p-ops-release:${escrow.referenceKey}`;

    try {
      await prisma.$transaction(async (tx) => {
        const locked = await tx.dexP2pEscrow.updateMany({
          where: { id: escrow.id, status: { in: ["held", "disputed"] } },
          data: { status: "released", releasedAt: new Date() },
        });
        if (locked.count !== 1) throw new Error("Escrow already settled");

        await creditOpgb(
          {
            studentId: makerId,
            organizationId: maker.organizationId,
            amountUgx: escrow.amountUgx,
            kind: "p2p_escrow_release",
            referenceKey: releaseKey,
            sourceRail: "dex_p2p",
            memo: `Ops release ${offer.asset}${note ? `: ${note}` : ""}`,
          },
          tx,
        );

        const takerWallet = await tx.opgbWallet.findUniqueOrThrow({
          where: { studentId: escrow.takerStudentId },
        });
        await creditOpgbAsset(
          {
            walletId: takerWallet.id,
            asset: offerCryptoAsset(offer.asset),
            amount: offer.amount,
          },
          tx,
        );

        await tx.dexP2pDispute.update({
          where: { id: dispute.id },
          data: {
            status: "resolved_release",
            resolvedAt: new Date(),
            reason: note ? `${dispute.reason} | ops: ${note}` : dispute.reason,
          },
        });
      });

      return {
        ok: true,
        escrowId: escrow.id,
        disputeId: dispute.id,
        message: `Dispute resolved: released to parties.`,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Resolve release failed";
      return { ok: false, error: msg, status: 409 };
    }
  }

  // refund → buyer
  const taker = await prisma.student.findUnique({
    where: { id: escrow.takerStudentId },
    select: { organizationId: true },
  });
  if (!taker) return { ok: false, error: "Student not found", status: 404 };

  const refundKey = `p2p-ops-refund:${escrow.referenceKey}`;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.dexP2pEscrow.updateMany({
        where: { id: escrow.id, status: { in: ["held", "disputed"] } },
        data: { status: "cancelled", releasedAt: new Date() },
      });
      if (locked.count !== 1) throw new Error("Escrow already settled");

      await creditOpgb(
        {
          studentId: escrow.takerStudentId,
          organizationId: taker.organizationId,
          amountUgx: escrow.amountUgx,
          kind: "p2p_escrow_release",
          referenceKey: refundKey,
          sourceRail: "dex_p2p",
          memo: `Ops refund escrow ${escrow.id}${note ? `: ${note}` : ""}`,
        },
        tx,
      );

      await tx.dexP2pOffer.update({
        where: { id: escrow.offerId },
        data: { status: "open" },
      });

      await tx.dexP2pDispute.update({
        where: { id: dispute.id },
        data: {
          status: "resolved_refund",
          resolvedAt: new Date(),
          reason: note ? `${dispute.reason} | ops: ${note}` : dispute.reason,
        },
      });
    });

    return {
      ok: true,
      escrowId: escrow.id,
      disputeId: dispute.id,
      message: "Dispute resolved: OPGB refunded to buyer.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resolve refund failed";
    return { ok: false, error: msg, status: 409 };
  }
}

export async function processAutoReleaseEscrows(limit = 25) {
  const now = new Date();
  const due = await prisma.dexP2pEscrow.findMany({
    where: {
      status: "held",
      autoReleaseAt: { lte: now },
    },
    take: limit,
    include: { offer: true },
  });

  let released = 0;
  for (const escrow of due) {
    if (!escrow.offer.makerStudentId) continue;
    const result = await releaseP2pEscrow({
      escrowId: escrow.id,
      actorStudentId: escrow.offer.makerStudentId,
    });
    if (result.ok) released += 1;
  }
  return { due: due.length, released };
}

export function p2pAutoReleaseAt() {
  return new Date(Date.now() + AUTO_RELEASE_MS);
}
