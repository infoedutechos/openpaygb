// Admin: update or delete a milestone banner

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';

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
    const { title, subtitle, body: bodyText, isActive } = body;
    const updateData: { title?: string; subtitle?: string; body?: string; isActive?: boolean } = {};
    if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
    if (typeof subtitle === 'string') updateData.subtitle = subtitle.trim();
    if (typeof bodyText === 'string') updateData.body = bodyText.trim();
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    if (updateData.isActive === true) {
      await prisma.milestoneBanner.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }

    const banner = await prisma.milestoneBanner.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(banner);
  } catch (error) {
    console.error('[admin/milestone-banners] PATCH', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
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
    await prisma.milestoneBanner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/milestone-banners] DELETE', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
