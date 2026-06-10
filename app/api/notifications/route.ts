// app/api/notifications/route.ts
// Public API: list active notifications for the in-app notification center

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

import { apiErrorResponse } from "@/lib/api-error";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const res = NextResponse.json(notifications);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "notifications", fallback: "Failed to fetch notifications" });
  }
}
