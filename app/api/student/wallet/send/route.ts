import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { sendWalletBetweenCards } from "@/lib/wallet-send";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  recipientEmail: z.string().email(),
  amountUgx: z.number().int().positive(),
  memo: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`wallet-send:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getStudentFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const fromCard = await prisma.openPayCard.findUnique({ where: { studentId: session.sub } });
    if (!fromCard || fromCard.status !== "active") {
      return NextResponse.json({ error: "Active OpenPayGB card required" }, { status: 403 });
    }

    const recipient = await prisma.student.findFirst({
      where: {
        organizationId: fromCard.organizationId,
        email: { equals: parsed.data.recipientEmail.trim(), mode: "insensitive" },
      },
      include: { openPayCard: true },
    });
    if (!recipient?.openPayCard || recipient.openPayCard.status !== "active") {
      return NextResponse.json({ error: "Recipient has no active card at this institution" }, { status: 404 });
    }

    const transfer = await sendWalletBetweenCards({
      fromCardId: fromCard.id,
      toCardId: recipient.openPayCard.id,
      amountUgx: parsed.data.amountUgx,
      memo: parsed.data.memo,
    });

    return NextResponse.json({
      transfer: {
        id: transfer.id,
        amountUgx: transfer.amountUgx,
        memo: transfer.memo,
        createdAt: transfer.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/wallet/send" });
  }
}
