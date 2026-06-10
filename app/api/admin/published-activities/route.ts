import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

import { apiErrorResponse } from "@/lib/api-error";
export async function GET(req: NextRequest) {
  const err = getAdminAuthError(req);
  if (err) return NextResponse.json(err.body, { status: err.status });
  try {
    const items = await prisma.publishedActivity.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/published-activities", fallback: "Failed to fetch" });
  }
}

export async function POST(req: NextRequest) {
  const err = getAdminAuthError(req);
  if (err) return NextResponse.json(err.body, { status: err.status });
  try {
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Body is required' }, { status: 400 });

    const link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;
    const linkLabel = typeof body.linkLabel === 'string' && body.linkLabel.trim() ? body.linkLabel.trim() : null;

    const row = await prisma.publishedActivity.create({
      data: {
        title,
        body: text,
        link,
        linkLabel,
        isPublished: body.isPublished === true,
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/published-activities", fallback: "Failed to create" });
  }
}
