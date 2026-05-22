import { jwtVerify } from "jose";

export type PayAdminJwtRole = "master" | "org_admin";

export type PayAdminJwtPayload = {
  sub: string;
  email: string;
  role: PayAdminJwtRole;
};

function normalizeJwtRole(raw: unknown): PayAdminJwtRole | null {
  if (raw === "master") return "master";
  if (raw === "org_admin") return "org_admin";
  if (raw === "admin") return "org_admin";
  return null;
}

/**
 * Verify tuition admin session JWT (`odelhub_admin`). Edge-safe; no `next/headers`.
 * Returns null for missing secret, bad token, or expiry.
 */
export async function verifyPayAdminJwt(token: string): Promise<PayAdminJwtPayload | null> {
  try {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 16) return null;
    const secret = new TextEncoder().encode(s);
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const role = normalizeJwtRole(payload.role);
    if (!sub || !email || !role) return null;
    return { sub, email, role };
  } catch {
    return null;
  }
}
