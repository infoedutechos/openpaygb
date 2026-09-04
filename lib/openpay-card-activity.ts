import "server-only";

import { prisma } from "@/lib/prisma";
import { getOpgbWalletSummary } from "@/lib/opgb-ledger";

export type OpenPayCardActivityItem = {
  id: string;
  kind: string;
  label: string;
  amountUgx: number;
  direction: "in" | "out" | "neutral";
  status: string;
  createdAt: string;
  rail?: string;
};

export async function listOpenPayCardActivity(opts: {
  studentId: string;
  cardId: string;
  limit?: number;
}): Promise<OpenPayCardActivityItem[]> {
  const limit = Math.min(opts.limit ?? 30, 50);
  const [topups, transfersOut, transfersIn, wallet] = await Promise.all([
    prisma.openPayCardTopup.findMany({
      where: { cardId: opts.cardId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.walletTransfer.findMany({
      where: { fromCardId: opts.cardId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.walletTransfer.findMany({
      where: { toCardId: opts.cardId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    getOpgbWalletSummary(opts.studentId),
  ]);

  const items: OpenPayCardActivityItem[] = [];

  for (const t of topups) {
    const isIssue = t.memo.startsWith("opcardissuemomo:") || t.memo.startsWith("opcard:");
    items.push({
      id: `topup:${t.id}`,
      kind: isIssue ? "issue_fee" : "topup",
      label: isIssue
        ? "Card activation fee"
        : t.fundingRail === "ton"
          ? "Top up via TON"
          : `Top up via ${t.fundingRail.toUpperCase()}`,
      amountUgx: t.amountUgx,
      direction: isIssue ? "out" : "in",
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      rail: t.fundingRail,
    });
  }

  for (const tr of transfersOut) {
    items.push({
      id: `xfer-out:${tr.id}`,
      kind: "transfer_out",
      label: tr.memo?.trim() || "Sent to OPGB card",
      amountUgx: tr.amountUgx,
      direction: "out",
      status: tr.status,
      createdAt: tr.createdAt.toISOString(),
    });
  }

  for (const tr of transfersIn) {
    items.push({
      id: `xfer-in:${tr.id}`,
      kind: "transfer_in",
      label: tr.memo?.trim() || "Received on OPGB card",
      amountUgx: tr.amountUgx,
      direction: "in",
      status: tr.status,
      createdAt: tr.createdAt.toISOString(),
    });
  }

  for (const e of wallet?.entries ?? []) {
    if (e.kind === "deposit_card_topup" || e.kind === "deposit_momo" || e.kind === "deposit_ton") {
      continue; // already covered via topups when possible
    }
    items.push({
      id: `ledger:${e.id}`,
      kind: e.kind,
      label: e.memo?.trim() || e.kind.replace(/_/g, " "),
      amountUgx: e.amountMinor,
      direction: e.direction === "credit" ? "in" : "out",
      status: "completed",
      createdAt: e.createdAt,
      rail: e.sourceRail || undefined,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, limit);
}
