// app/api/admin/export/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { User } from '@prisma/client';
import { getAdminAuthError } from '@/utils/admin-session';

import { apiErrorResponse } from "@/lib/api-error";
const PAGE_SIZE = 100000; // Adjust based on your needs and server capabilities

export async function POST(req: NextRequest) {
    const authError = getAdminAuthError(req);
    if (authError) return NextResponse.json(authError.body, { status: authError.status });

    try {
        const { fields, page = 0 } = await req.json() as { fields: (keyof User)[], page?: number };

        const users = await prisma.user.findMany({
            select: fields.reduce((acc, field) => {
                acc[field] = true;
                return acc;
            }, {} as { [K in keyof User]?: true }),
            skip: page * PAGE_SIZE,
            take: PAGE_SIZE,
        });

        const totalUsers = await prisma.user.count();
        const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

        return NextResponse.json({
            users,
            page,
            totalPages,
            hasMore: page < totalPages - 1
        });
    } catch (e) {
    return apiErrorResponse(e, { route: "admin/export", fallback: "Export failed" });
  }
}