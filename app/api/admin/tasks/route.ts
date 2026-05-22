// app/api/admin/tasks/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const tasks = await prisma.task.findMany();
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const taskData = await req.json();
  const task = await prisma.task.create({ data: taskData });
  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const body = await req.json().catch(() => ({}));
    const { ids, randomCount } = body as { ids?: string[]; randomCount?: number };

    if (ids && Array.isArray(ids) && ids.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (typeof randomCount === 'number' && randomCount > 0) {
      const all = await prisma.task.findMany({ select: { id: true } });
      const toDelete = all
        .map((t) => t.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(randomCount, all.length));
      if (toDelete.length > 0) {
        await prisma.task.deleteMany({
          where: { id: { in: toDelete } },
        });
      }
      return NextResponse.json({ success: true, deleted: toDelete.length });
    }

    return NextResponse.json(
      { error: 'Provide ids (string[]) or randomCount (number)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Bulk delete tasks error:', error);
    return NextResponse.json({ error: 'Failed to delete tasks' }, { status: 500 });
  }
}
