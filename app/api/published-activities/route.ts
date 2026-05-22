// Public: published activity posts + visible earn tasks for Earn tab (newest first).
// Read-only list is public (no Telegram gate) so content loads even if initData is missing or stale.

import { NextResponse } from 'next/server';
import type { TaskType } from '@prisma/client';
import prisma from '@/utils/prisma';

export const dynamic = 'force-dynamic';

type TaskDataJson = { link?: string; chatId?: string };

function taskExternalLink(type: TaskType, taskData: unknown): string | null {
  const d =
    taskData && typeof taskData === 'object' && !Array.isArray(taskData)
      ? (taskData as TaskDataJson)
      : {};
  if (type === 'VISIT' || type === 'REDEEM_CODE') {
    const link = typeof d.link === 'string' ? d.link.trim() : '';
    return link || null;
  }
  if (type === 'TELEGRAM') {
    const chatId = typeof d.chatId === 'string' ? d.chatId.trim() : '';
    if (!chatId) return null;
    if (/^https?:\/\//i.test(chatId)) return chatId;
    const handle = chatId.replace(/^@/, '');
    return `https://t.me/${handle}`;
  }
  return null;
}

/** Mongo ObjectId hex → approximate creation time for sorting */
function objectIdToIso(id: string): string {
  if (!/^[a-f0-9]{24}$/i.test(id)) return new Date(0).toISOString();
  const sec = parseInt(id.slice(0, 8), 16);
  return new Date(sec * 1000).toISOString();
}

export async function GET() {
  try {
    const [items, activeTasks] = await Promise.all([
      prisma.publishedActivity.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          body: true,
          link: true,
          linkLabel: true,
          createdAt: true,
        },
      }),
      prisma.task.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          description: true,
          points: true,
          type: true,
          category: true,
          image: true,
          callToAction: true,
          taskData: true,
          isHidden: true,
        },
      }),
    ]);

    const visibleTasks = activeTasks.filter((t) => t.isHidden !== true);

    const fromPosts = items.map((row) => ({
      id: row.id,
      kind: 'post' as const,
      title: row.title,
      body: row.body,
      link: row.link,
      linkLabel: row.linkLabel,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    }));

    const fromTasks = visibleTasks.map((task) => {
      const link = taskExternalLink(task.type, task.taskData);
      const cta = typeof task.callToAction === 'string' ? task.callToAction.trim() : '';
      return {
        id: `task:${task.id}`,
        kind: 'task' as const,
        title: task.title,
        body: task.description,
        points: task.points,
        category: task.category,
        image: task.image,
        link,
        linkLabel: link ? cta || 'Open link' : null,
        createdAt: objectIdToIso(task.id),
      };
    });

    const activities = [...fromPosts, ...fromTasks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({ activities });
  } catch (e) {
    console.error('[published-activities] prisma', e);
    return NextResponse.json({ error: 'Failed to load activities' }, { status: 500 });
  }
}
