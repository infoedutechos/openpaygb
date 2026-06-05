import type { PlatformAudience } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { hubToAudiences } from "@/lib/knowledge-base/types";

export type PlatformNotificationRow = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  href: string | null;
  audience: PlatformAudience;
  isActive: boolean;
  createdAt: string;
  read: boolean;
};

export async function listPlatformNotifications(opts: {
  hub?: PlatformHub;
  readerKey: string;
  limit?: number;
}): Promise<PlatformNotificationRow[]> {
  const audiences = hubToAudiences(opts.hub ?? "all");
  const rows = await withPrismaRetry(() =>
    prisma.notification.findMany({
      where: { isActive: true, audience: { in: audiences } },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 50,
    }),
  );

  const ids = rows.map((r) => r.id);
  const reads =
    ids.length === 0
      ? []
      : await withPrismaRetry(() =>
          prisma.notificationRead.findMany({
            where: { readerKey: opts.readerKey, notificationId: { in: ids } },
          }),
        );
  const readSet = new Set(reads.map((r) => r.notificationId));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    imageUrl: r.imageUrl,
    videoUrl: r.videoUrl,
    href: r.href ?? null,
    audience: r.audience,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    read: readSet.has(r.id),
  }));
}

export async function markNotificationsRead(readerKey: string, ids: string[]): Promise<number> {
  let marked = 0;
  for (const notificationId of ids) {
    await withPrismaRetry(() =>
      prisma.notificationRead.upsert({
        where: { notificationId_readerKey: { notificationId, readerKey } },
        create: { notificationId, readerKey },
        update: { readAt: new Date() },
      }),
    );
    marked += 1;
  }
  return marked;
}
