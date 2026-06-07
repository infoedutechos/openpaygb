import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import { deleteTelegramMessage } from "@/utils/telegram-notify";

const BATCH_SIZE = 25;
const DELAY_MS = 1100;

/** Master Admin: remove Telegram copies of a platform notification from user chats. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const { id: notificationId } = await ctx.params;
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { notificationId },
      select: { telegramId: true, messageId: true },
    });

    if (deliveries.length === 0) {
      return NextResponse.json({
        ok: true,
        deleted: 0,
        message: "No Telegram messages were sent for this notification, or they were already recalled.",
      });
    }

    void (async () => {
      try {
        for (let i = 0; i < deliveries.length; i += BATCH_SIZE) {
          const batch = deliveries.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map((d) => deleteTelegramMessage(d.telegramId, d.messageId)),
          );
          if (i + BATCH_SIZE < deliveries.length) {
            await new Promise((r) => setTimeout(r, DELAY_MS));
          }
        }
        await prisma.notificationDelivery.deleteMany({ where: { notificationId } });
      } catch (err) {
        console.error("[master/notifications] recall background failed:", err);
      }
    })();

    return NextResponse.json({
      ok: true,
      message: "Recall started. Messages are being removed from Telegram user chats.",
      total: deliveries.length,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/notifications/[id]/recall" });
  }
}
