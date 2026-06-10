/**
 * Join flow is now invite-based: use POST /api/global-tasks/[id]/invite to send an invite,
 * then opponent uses POST /api/global-tasks/challenges/[challengeId]/accept to accept and stake.
 */

import { NextResponse } from 'next/server';

import { apiErrorResponse } from "@/lib/api-error";
export async function POST() {
  try {
  return NextResponse.json(
    { error: 'Use invite flow: POST /api/global-tasks/[id]/invite to invite; opponent accepts at /api/global-tasks/challenges/[challengeId]/accept' },
    { status: 410 }
  );

  } catch (e) {
    return apiErrorResponse(e, { route: "global-tasks/[id]/join/post", fallback: "Request failed" });
  }
}
