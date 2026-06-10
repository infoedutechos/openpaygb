// app/api/admin/tasks/[id]/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

import { apiErrorResponse } from "@/lib/api-error";
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const { id: routeId } = await params;
    const taskData = (await req.json()) as Record<string, unknown>;
    const updateData = { ...taskData };
    delete (updateData as { id?: string }).id;

    const task = await prisma.task.update({
      where: { id: routeId },
      data: updateData,
    });

    return NextResponse.json(task);
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/tasks/[id]", fallback: "Failed to update task" });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const { id: routeId } = await params;
    await prisma.task.delete({
      where: { id: routeId },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/tasks/[id]", fallback: "Failed to delete task" });
  }
}
