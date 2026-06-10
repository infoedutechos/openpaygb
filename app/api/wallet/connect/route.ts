// app/api/wallet/connect/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { isPlausibleTonAddress, normalizeTonAddress } from '@/lib/ton-address';

import { apiErrorResponse } from "@/lib/api-error";
interface ConnectWalletRequestBody {
    initData: string;
    walletAddress: string;
}

export async function POST(req: Request) {
    const requestBody: ConnectWalletRequestBody = await req.json();
    const { initData: telegramInitData, walletAddress } = requestBody;

    if (!telegramInitData || !walletAddress) {
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

    if (!isPlausibleTonAddress(walletAddress)) {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const normalizedAddress = normalizeTonAddress(walletAddress);

    try {
        const updatedUser = await prisma.user.update({
            where: { telegramId },
            data: { tonWalletAddress: normalizedAddress },
        });

        return NextResponse.json({
            success: true,
            message: 'Wallet connected successfully',
            walletAddress: updatedUser.tonWalletAddress,
        });

    } catch (e) {
    return apiErrorResponse(e, { route: "wallet/connect", fallback: "Request failed" });
  }
}