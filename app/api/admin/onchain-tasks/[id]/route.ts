// app/api/admin/onchain-tasks/[id]/route.ts

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
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = getAdminAuthError(req);
    if (authError) return NextResponse.json(authError.body, { status: authError.status });

    try {
        const { id } = await context.params;
        const taskData = await req.json();

        const task = await prisma.onchainTask.update({
            where: { id },
            data: { isActive: taskData.isActive, points: taskData.points },
        });

        return NextResponse.json(task);
    } catch (e) {
    return apiErrorResponse(e, { route: "admin/onchain-tasks/[id]", fallback: "Failed to update onchain task" });
  }
}