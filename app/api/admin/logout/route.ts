/**
 * POST /api/admin/logout - clear admin session cookie
 */

import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME } from '@/utils/admin-session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
