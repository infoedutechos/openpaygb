// app/api/admin/notifications/[id]/route.ts
// Admin: update (toggle active, edit) or delete a notification

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';

import { apiErrorResponse } from "@/lib/api-error";
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const { title, body: bodyText, imageUrl, videoUrl, isActive } = body;
    const updateData: {
      title?: string;
      body?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      isActive?: boolean;
    } = {};
    if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
    if (typeof bodyText === 'string') updateData.body = bodyText.trim();
    if (imageUrl !== undefined) updateData.imageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
    if (videoUrl !== undefined) updateData.videoUrl = typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : null;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    const notification = await prisma.notification.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(notification);
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/notifications/[id]", fallback: "Failed to update notification" });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.notification.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/notifications/[id]", fallback: "Failed to delete notification" });
  }
}
