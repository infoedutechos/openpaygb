import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = getAdminAuthError(req);
  if (err) return NextResponse.json(err.body, { status: err.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = await req.json();
    const data: {
      title?: string;
      body?: string;
      link?: string | null;
      linkLabel?: string | null;
      isPublished?: boolean;
    } = {};

    if (typeof body.title === 'string') data.title = body.title.trim();
    if (typeof body.body === 'string') data.body = body.body.trim();
    if ('link' in body) {
      data.link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;
    }
    if ('linkLabel' in body) {
      data.linkLabel = typeof body.linkLabel === 'string' && body.linkLabel.trim() ? body.linkLabel.trim() : null;
    }
    if (typeof body.isPublished === 'boolean') data.isPublished = body.isPublished;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const row = await prisma.publishedActivity.update({
      where: { id },
      data,
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error('[admin/published-activities PATCH]', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = getAdminAuthError(req);
  if (err) return NextResponse.json(err.body, { status: err.status });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await prisma.publishedActivity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/published-activities DELETE]', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
