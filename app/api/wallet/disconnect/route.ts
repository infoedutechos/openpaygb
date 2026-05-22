// app/api/wallet/disconnect/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

interface DisconnectWalletRequestBody {
    initData: string;
}

export async function POST(req: Request) {
    const requestBody: DisconnectWalletRequestBody = await req.json();
    const { initData: telegramInitData } = requestBody;

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
        await prisma.user.update({
            where: { telegramId },
            data: { tonWalletAddress: null },
        });

        return NextResponse.json({
            success: true,
            message: 'Wallet disconnected successfully',
        });

    } catch (error) {
        console.error('Error disconnecting wallet:', error);
        return NextResponse.json({ error: 'Failed to disconnect wallet' }, { status: 500 });
    }
}