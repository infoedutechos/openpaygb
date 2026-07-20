import { NextResponse } from "next/server";
import { z } from "zod";
import { createTonPayTransfer, TON } from "@ton-pay/api";
import { requireAdminOpenPayHolder } from "@/lib/admin-openpay-api";
import { getServerTonPayOptions } from "@/lib/ton-pay-options";
import {
  getStudentOpenPayCard,
  openPayCardFundMemo,
  platformTonWalletForCardOps,
} from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { getActiveUgxPerTonForOrganization } from "@/lib/fx";
import { ugxToTon } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  amountUgx: z.number().int().min(1000).max(500_000_000),
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

    const card = await getStudentOpenPayCard(gate.holder.studentId);
    if (!card || card.status !== "active") {
      return NextResponse.json({ error: "Activate your OpenPayGB card before adding funds" }, { status: 409 });
    }

    const fx = await getActiveUgxPerTonForOrganization(gate.holder.organizationId);
    const tonAmount = ugxToTon(parsed.data.amountUgx, fx.ugxPerTon);
    const topup = await prisma.openPayCardTopup.create({
      data: {
        cardId: card.id,
        amountUgx: parsed.data.amountUgx,
        tonAmount,
        memo: "",
        status: "pending",
      },
    });

    const memo = openPayCardFundMemo(card.id, topup.id);
    await prisma.openPayCardTopup.update({
      where: { id: topup.id },
      data: { memo },
    });

    const wallet = platformTonWalletForCardOps();
    if (!wallet || wallet.includes("placeholder")) {
      return NextResponse.json({ error: "Platform TON wallet is not configured" }, { status: 503 });
    }

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
      topupId: topup.id,
      amountUgx: parsed.data.amountUgx,
      tonAmount,
      ugxPerTon: fx.ugxPerTon,
      memo,
      destinationWallet: wallet,
      message,
      reference,
      bodyBase64Hash,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/openpay-card/fund/transfer" });
  }
}
