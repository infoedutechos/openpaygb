/**
 * Admin: clear the item password cookie so user must re-enter when opening a section again.
 * Called when leaving protected sections (e.g. landing on dashboard or notifications).
 */

import { NextResponse } from 'next/server';
import { isAdminAuthorized, ADMIN_ITEM_COOKIE_NAME } from '@/utils/admin-session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookies.set(ADMIN_ITEM_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
