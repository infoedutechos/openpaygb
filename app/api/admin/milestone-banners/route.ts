// Admin: list all milestone banners, create new

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

import { apiErrorResponse } from "@/lib/api-error";
export async function GET(req: NextRequest) {
  const err = getAdminAuthError(req);
  if (err) return NextResponse.json(err.body, { status: err.status });
  try {
    const banners = await prisma.milestoneBanner.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(banners);
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/milestone-banners", fallback: "Failed to fetch" });
  }
}

export async function POST(req: NextRequest) {
  const err = getAdminAuthError(req);
  if (err) return NextResponse.json(err.body, { status: err.status });
  try {
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : '';
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    if (body.isActive === true) {
      await prisma.milestoneBanner.updateMany({ data: { isActive: false } });
    }

    const banner = await prisma.milestoneBanner.create({
      data: {
        title,
        subtitle: subtitle || '',
        body: bodyText || '',
        isActive: body.isActive === true,
      },
    });
    return NextResponse.json(banner);
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/milestone-banners", fallback: "Failed to create" });
  }
}
