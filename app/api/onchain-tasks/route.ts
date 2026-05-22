// app/api/onchain-tasks/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function GET(req: NextRequest) {
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
        // Fetch the user
        const user = await prisma.user.findUnique({
            where: { telegramId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Fetch active onchain tasks
        const onchainTasks = await prisma.onchainTask.findMany({
            where: { isActive: true },
        });

        // Fetch user's completions
        const userCompletions = await prisma.onchainTaskCompletion.findMany({
            where: {
                userId: user.id,
                onchainTask: {
                    isActive: true,
                },
            },
        });

        // Combine task data with completion status
        const tasksWithCompletions = onchainTasks.map(task => ({
            ...task,
            isCompleted: userCompletions.some(
                completion => completion.onchainTaskId === task.id
            ),
        }));

        return NextResponse.json(tasksWithCompletions);
    } catch (error) {
        console.error('Fetch onchain tasks error:', error);
        return NextResponse.json({ error: 'Failed to fetch onchain tasks' }, { status: 500 });
    }
}