/**
 * Join flow is now invite-based: use POST /api/global-tasks/[id]/invite to send an invite,
 * then opponent uses POST /api/global-tasks/challenges/[challengeId]/accept to accept and stake.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use invite flow: POST /api/global-tasks/[id]/invite to invite; opponent accepts at /api/global-tasks/challenges/[challengeId]/accept' },
    { status: 410 }
  );
}
