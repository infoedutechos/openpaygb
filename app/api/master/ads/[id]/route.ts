import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import { recordAdModeration, recordAdSpend, ensureAdPlatformSettings } from "@/lib/ads/service";
import { dispatchPlatformNotificationToTelegram } from "@/lib/notification-telegram";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

type Ctx = { params: Promise<{ id: string }> };

const ActionBody = z.object({
  action: z.enum(["approve", "reject", "pause", "resume", "activate", "cancel", "record_spend"]),
  note: z.string().max(1000).optional().default(""),
  amountMinor: z.number().int().min(1).optional(),
  deliverTelegram: z.boolean().optional().default(false),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const { id } = await ctx.params;

    const json = await req.json().catch(() => null);
    const parsed = ActionBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      include: { creative: true, placement: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { action, note, amountMinor, deliverTelegram } = parsed.data;
    let nextStatus = campaign.status;

    if (action === "approve") {
      nextStatus = "approved";
      await prisma.adCampaign.update({
        where: { id },
        data: {
          status: nextStatus,
          approvedAt: new Date(),
          approvedById: gate.user.id,
          rejectedReason: "",
        },
      });
    } else if (action === "reject") {
      nextStatus = "rejected";
      await prisma.adCampaign.update({
        where: { id },
        data: { status: nextStatus, rejectedReason: note || "Rejected" },
      });
    } else if (action === "pause") {
      nextStatus = "paused";
      await prisma.adCampaign.update({ where: { id }, data: { status: nextStatus } });
    } else if (action === "resume" || action === "activate") {
      nextStatus = "active";
      await prisma.adCampaign.update({
        where: { id },
        data: {
          status: nextStatus,
          approvedAt: campaign.approvedAt ?? new Date(),
          approvedById: campaign.approvedById ?? gate.user.id,
        },
      });
    } else if (action === "cancel") {
      nextStatus = "cancelled";
      await prisma.adCampaign.update({ where: { id }, data: { status: nextStatus } });
    } else if (action === "record_spend") {
      if (!amountMinor) {
        return NextResponse.json({ error: "amountMinor required" }, { status: 400 });
      }
      const settings = await ensureAdPlatformSettings();
      await recordAdSpend({
        campaignId: id,
        amountMinor,
        platformFeeBps: settings.platformFeeBps,
        memo: note || "MAC recorded spend",
      });
    }

    if (action !== "record_spend") {
      await recordAdModeration({
        campaignId: id,
        actorId: gate.user.id,
        action,
        note,
      });
    }

    if (deliverTelegram && (action === "activate" || action === "approve")) {
      const settings = await ensureAdPlatformSettings();
      if (settings.telegramDeliveryEnabled) {
        await warmDeploymentEnvCache();
        const notification = await prisma.notification.create({
          data: {
            title: campaign.creative.title,
            body: campaign.creative.body,
            imageUrl: campaign.creative.imageUrl,
            videoUrl: campaign.creative.videoUrl,
            href: campaign.creative.ctaHref || null,
            audience: "all",
            isActive: true,
          },
        });
        await prisma.adCampaign.update({
          where: { id },
          data: { notificationId: notification.id },
        });
        dispatchPlatformNotificationToTelegram({
          notificationId: notification.id,
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
          audience: notification.audience,
          postToTelegram: campaign.placement.surface === "telegram_channel",
          sendToUserBotChats:
            campaign.placement.surface === "telegram_bot" ||
            campaign.placement.surface === "telegram_mini_app",
        });
      }
    }

    const updated = await prisma.adCampaign.findUnique({
      where: { id },
      include: { creative: true, placement: true },
    });
    return NextResponse.json({ campaign: updated });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/ads/[id]" });
  }
}
