import { NextResponse } from "next/server";
import { z } from "zod";
import { createTonPayTransfer, TON } from "@ton-pay/api";
import { requireAdminOpenPayHolder } from "@/lib/admin-openpay-api";
import { getServerTonPayOptions } from "@/lib/ton-pay-options";
import {
  ensurePendingOpenPayCard,
  getStudentOpenPayCard,
  openPayCardIssueMemo,
  platformTonWalletForCardOps,
} from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  senderAddr: z.string().min(10).max(128),
});

export async function POST(req: Request) {
  try {
    const gate = await requireAdminOpenPayHolder(req);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "OpenPayGB card is not available" }, { status: 503 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    let card = await getStudentOpenPayCard(gate.holder.studentId);
    if (!card) {
      card = await ensurePendingOpenPayCard(gate.holder.studentId, gate.holder.organizationId);
    }
    if (card.status === "active") {
      return NextResponse.json({ error: "Your OpenPayGB card is already active" }, { status: 409 });
    }

    const tonAmount = card.issueFeeTon ?? settings.issueFeeTon;
    const memo = openPayCardIssueMemo(card.id);
    const wallet = platformTonWalletForCardOps();
    if (!wallet || wallet.includes("placeholder")) {
      return NextResponse.json({ error: "Platform TON wallet is not configured" }, { status: 503 });
    }

    await prisma.openPayCard.update({
      where: { id: card.id },
      data: { issueMemo: memo, issueFeeTon: tonAmount },
    });

    const { message, reference, bodyBase64Hash } = await createTonPayTransfer(
      {
        amount: tonAmount,
        asset: TON,
        recipientAddr: wallet,
        senderAddr: parsed.data.senderAddr.trim(),
        commentToSender: memo,
      },
      getServerTonPayOptions(),
    );

    return NextResponse.json({
      cardId: card.id,
      tonAmount,
      memo,
      destinationWallet: wallet,
      message,
      reference,
      bodyBase64Hash,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/openpay-card/issue/transfer" });
  }
}
