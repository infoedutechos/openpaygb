// Public API: get the active milestone banner (for the congratulations overlay on main screen)

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

import { apiErrorResponse } from "@/lib/api-error";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const banner = await prisma.milestoneBanner.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(banner ?? null);
  } catch (e) {
    return apiErrorResponse(e, { route: "milestone-banner", fallback: "Request failed" });
  }
}
