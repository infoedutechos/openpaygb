// Public API: get the active milestone banner (for the congratulations overlay on main screen)

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const banner = await prisma.milestoneBanner.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(banner ?? null);
  } catch (error) {
    console.error('[milestone-banner]', error);
    return NextResponse.json(null);
  }
}
