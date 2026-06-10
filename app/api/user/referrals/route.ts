// app/api/user/referrals/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateLevelIndex } from '@/utils/game-mechanics';
import { LEVELS } from '@/utils/consts';

import { apiErrorResponse } from "@/lib/api-error";
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
    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        referrals: {
          select: {
            id: true,
            telegramId: true,
            name: true,
            points: true,
            totalTaps: true,
            referralPointsEarned: true,
          }
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const referralsWithLevels = dbUser.referrals.map(referral => {
      const levelIndex = calculateLevelIndex(referral.points, referral.totalTaps ?? 0);
      const level = LEVELS[levelIndex];
      return {
        ...referral,
        levelName: level.name,
        levelImage: level.smallImage,
      };
    });

    return NextResponse.json({
      referrals: referralsWithLevels,
      referralCount: referralsWithLevels.length
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "user/referrals", fallback: "Failed to fetch user referrals" });
  }
}