// app/api/license/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import { openInnovationsLicensePlainText } from '@/utils/company-info';

import { apiErrorResponse } from "@/lib/api-error";
export async function GET() {
  try {
  return NextResponse.json({ 
    license: openInnovationsLicensePlainText(),
    version: '1.0.0',
    lastUpdated: '2024-08-20'
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });

  } catch (e) {
    return apiErrorResponse(e, { route: "license/get", fallback: "Request failed" });
  }
}