/**
 * POST /api/admin/login
 * Body: { password: string }
 * If password matches ADMIN_PASSWORD env, set admin_session cookie and return { ok: true }.
 * Otherwise return 401.
 */

import { NextResponse } from 'next/server';
import { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/utils/admin-session';
import { clientIp, rateLimitHit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`auth-shell-login:${ip}`, 15, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
    }

    const body = await req.json();
    const password = typeof body?.password === 'string' ? body.password : '';
    const expected = process.env.ADMIN_PASSWORD;

    if (!expected || password !== expected) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = createAdminSessionToken();
    if (!token) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
