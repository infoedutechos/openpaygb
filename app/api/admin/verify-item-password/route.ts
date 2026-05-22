/**
 * Admin: verify the "item password" (second password for protected sections).
 * POST { password, pathname } – if correct, set path-scoped cookie so user must re-enter for each section.
 */

import { NextResponse } from 'next/server';
import {
  createAdminItemSessionToken,
  ADMIN_ITEM_COOKIE_NAME,
  isAdminAuthorized,
} from '@/utils/admin-session';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours

const ALLOWED_PATHS = [
  '/admin/accounts',
  '/admin/bot-users',
  '/admin/tasks',
  '/admin/daily-cipher',
  '/admin/daily-combo',
  '/admin/cards',
  '/admin/weekly-event',
  '/admin/onchain-tasks',
  '/admin/export',
  '/admin/fees-collection',
  '/admin/staking-audit',
  '/admin/league-management',
  '/admin/global-tasks',
  '/admin/quiz',
  '/admin/daily-pattern',
  '/admin/shop',
  '/admin/milestone-banners',
];

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === 'string' ? body.password.trim() : '';
    const pathname = typeof body?.pathname === 'string' ? body.pathname.trim() : '';
    const expected = process.env.ADMIN_ITEM_PASSWORD?.trim();

    if (!expected) {
      return NextResponse.json(
        {
          error:
            'Set ADMIN_ITEM_PASSWORD in Vercel (Settings → Environment Variables) and redeploy.',
        },
        { status: 501 }
      );
    }
    if (password !== expected) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    if (!pathname || !isAllowedPath(pathname)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const token = createAdminItemSessionToken();
    if (!token) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    // path: '/' so the cookie is sent to both the page (/admin/...) and API (/api/admin/...)
    res.cookies.set(ADMIN_ITEM_COOKIE_NAME, token, {
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
