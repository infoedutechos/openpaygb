// app/api/tasks/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const telegramInitData = url.searchParams.get('initData');

  if (!telegramInitData) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  try {
    // User may not exist in DB yet (first open, sync lag). Still return public tasks so Earn is not empty.
    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
    });

    // Fetch active tasks; then exclude only those explicitly hidden (isHidden === true).
    // Tasks without isHidden (created before the field existed) are shown.
    const activeTasks = await prisma.task.findMany({
      where: { isActive: true },
    });
    const visibleTasks = activeTasks.filter((t) => t.isHidden !== true);

    // UserTask entries for this user for active tasks (we'll only return visible ones)
    const validUserTasks = dbUser
      ? await prisma.userTask.findMany({
          where: {
            userId: dbUser.id,
            task: { isActive: true },
          },
          include: {
            task: true,
          },
        })
      : [];

    // Prepare the response data — incomplete first, completed last (only visible tasks)
    const tasksData = visibleTasks
      .map(task => {
        const userTask = validUserTasks.find(ut => ut.taskId === task.id);
        return {
          ...task,
          taskStartTimestamp: userTask?.taskStartTimestamp || null,
          isCompleted: userTask?.isCompleted || false,
        };
      })
      .sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));

    return NextResponse.json({
      tasks: tasksData,
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch user tasks' }, { status: 500 });
  }
}