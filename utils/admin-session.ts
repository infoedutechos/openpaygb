/**
 * Admin session cookie: create and verify signed session for password-based admin login.
 * Used by /api/admin/login and admin layout. Session expires in 7 days.
 *
 * Do NOT import from `middleware.ts` (Node `crypto` is not Edge-safe). Use `@/lib/admin-session-edge`.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { isProductionRuntime } from '@/lib/production-secrets';

const COOKIE_NAME = 'admin_session';
const TTL_SEC = 7 * 24 * 60 * 60; // 7 days
const PAYLOAD_SEP = '.';

function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return '';
  return secret;
}

/** Build signed cookie value: expiry.signature (base64url) */
export function createAdminSessionToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `${exp}${PAYLOAD_SEP}admin`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${exp}${PAYLOAD_SEP}${sig}`;
}

/**
 * True if the browser has URA password admin access or local dev admin bypass
 * (matches non–Pay-JWT paths in `app/admin/layout.tsx`).
 */
export function hasAdminShellAccess(sessionCookieValue: string | undefined, host: string): boolean {
  if (!isProductionRuntime()) {
    const isLocalhost = host.includes("localhost");
    if (isLocalhost && process.env.ACCESS_ADMIN === "true") return true;
  }
  return verifyAdminSessionToken(sessionCookieValue);
}

/** Verify cookie value; returns true if valid and not expired */
export function verifyAdminSessionToken(value: string | undefined): boolean {
  if (!value) return false;
  const secret = getSecret();
  if (!secret) return false;
  const parts = value.split(PAYLOAD_SEP);
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || exp <= 0) return false;
  if (Date.now() / 1000 > exp) return false;
  const payload = `${expStr}${PAYLOAD_SEP}admin`;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export const ADMIN_SESSION_COOKIE_NAME = COOKIE_NAME;

/** Parse Cookie header and return value for given name */
function getCookieFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

/**
 * Returns true if the request is authorized for admin: either has a valid admin_session cookie
 * (password login) or is from localhost with ACCESS_ADMIN=true.
 * Use this in admin API routes so they work in both localhost and production.
 */
export function isAdminAuthorized(req: Request): boolean {
  if (!isProductionRuntime()) {
    const host = req.headers.get('host') ?? '';
    const isLocalhost = host.includes('localhost');
    const isAdminEnabled = process.env.ACCESS_ADMIN === 'true';
    if (isLocalhost && isAdminEnabled) return true;
  }
  const cookieHeader = req.headers.get('cookie');
  const sessionValue = getCookieFromHeader(cookieHeader, COOKIE_NAME);
  return verifyAdminSessionToken(sessionValue);
}

// --- Item password (second gate for protected admin sections) ---
const ITEM_COOKIE_NAME = 'admin_item_session';
const ITEM_TTL_SEC = 24 * 60 * 60; // 24 hours

function getItemSecret(): string {
  const secret = process.env.ADMIN_ITEM_PASSWORD;
  if (secret == null || String(secret).trim() === '') return '';
  return String(secret).trim();
}

/** Create token: one cookie for "item verified"; cleared when leaving (dashboard/notifications) so gate shows when opening a section. */
export function createAdminItemSessionToken(): string | null {
  const secret = getItemSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ITEM_TTL_SEC;
  const payload = `${exp}${PAYLOAD_SEP}item`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${exp}${PAYLOAD_SEP}${sig}`;
}

/** Verify token (no path: one password unlocks until you leave). */
export function verifyAdminItemSessionToken(value: string | undefined): boolean {
  if (!value) return false;
  const secret = getItemSecret();
  if (!secret) return false;
  const parts = value.split(PAYLOAD_SEP);
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || exp <= 0) return false;
  if (Date.now() / 1000 > exp) return false;
  const payload = `${expStr}${PAYLOAD_SEP}item`;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export const ADMIN_ITEM_COOKIE_NAME = ITEM_COOKIE_NAME;

/** True if no item gate or request has valid item session cookie. */
export function isItemVerified(req: Request): boolean {
  if (!getItemSecret()) return true;
  const cookieHeader = req.headers.get('cookie');
  const value = getCookieFromHeader(cookieHeader, ITEM_COOKIE_NAME);
  return verifyAdminItemSessionToken(value);
}

/** True when the item password (second gate) is configured */
export function isItemGateEnabled(): boolean {
  return !!getItemSecret();
}

/** Use in protected admin APIs. Returns error to send or null if authorized. */
export function getAdminAuthError(req: Request): { status: number; body: { error: string; code?: string } } | null {
  if (!isAdminAuthorized(req)) return { status: 403, body: { error: 'Unauthorized' } };
  if (!isItemVerified(req)) return { status: 403, body: { error: 'Section password required', code: 'ITEM_REQUIRED' } };
  return null;
}
