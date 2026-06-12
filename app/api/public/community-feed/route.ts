import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    if (rateLimitHit(`community-feed:${clientIp(req)}`, 60, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? "6"), 12);

    const [activities, notifications] = await Promise.all([
      prisma.publishedActivity.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          body: true,
          link: true,
          linkLabel: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          body: true,
          href: true,
          createdAt: true,
        },
      }),
    ]);

    const items = [
      ...activities.map((a) => ({
        id: `activity:${a.id}`,
        kind: "activity" as const,
        title: a.title,
        body: a.body.slice(0, 200),
        href: a.link,
        linkLabel: a.linkLabel,
        createdAt: a.createdAt.toISOString(),
      })),
      ...notifications.map((n) => ({
        id: `notify:${n.id}`,
        kind: "announcement" as const,
        title: n.title,
        body: (n.body ?? "").slice(0, 200),
        href: n.href,
        linkLabel: "Read more",
        createdAt: n.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ items });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/community-feed" });
  }
}
