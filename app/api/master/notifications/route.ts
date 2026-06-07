import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import { dispatchPlatformNotificationToTelegram } from "@/lib/notification-telegram";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        imageUrl: n.imageUrl,
        videoUrl: n.videoUrl,
        href: n.href,
        audience: n.audience,
        isActive: n.isActive,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/notifications" });
  }
}

const CreateBody = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional().default(""),
  imageUrl: z.string().max(2000).optional().nullable(),
  videoUrl: z.string().max(2000).optional().nullable(),
  href: z.string().max(2000).optional().nullable(),
  audience: z.enum(["all", "tuition", "play", "admin"]).optional().default("all"),
  isActive: z.boolean().optional().default(true),
  postToTelegram: z.boolean().optional(),
  sendToUserBotChats: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const body = parsed.data;
    const notification = await prisma.notification.create({
      data: {
        title: body.title.trim(),
        body: body.body.trim(),
        imageUrl: body.imageUrl?.trim() ? body.imageUrl.trim() : null,
        videoUrl: body.videoUrl?.trim() ? body.videoUrl.trim() : null,
        href: body.href?.trim() ? body.href.trim() : null,
        audience: body.audience,
        isActive: body.isActive !== false,
      },
    });

    if (body.postToTelegram || body.sendToUserBotChats) {
      await warmDeploymentEnvCache();
      dispatchPlatformNotificationToTelegram({
        notificationId: notification.id,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        audience: notification.audience,
        postToTelegram: body.postToTelegram,
        sendToUserBotChats: body.sendToUserBotChats,
      });
    }

    return NextResponse.json({
      notification: {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/notifications" });
  }
}
