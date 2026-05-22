import { jwtVerify } from "jose";

export type StudentJwtPayload = {
  sub: string;
  organizationId: string;
};

/**
 * Verify student session JWT (Edge-safe; no next/headers).
 * Returns null for missing secret, bad token, or expiry.
 */
export async function verifyStudentJwt(token: string): Promise<StudentJwtPayload | null> {
  try {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 16) return null;
    const secret = new TextEncoder().encode(s);
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const organizationId =
      typeof payload.organizationId === "string" ? payload.organizationId : null;
    if (!sub || !organizationId) return null;
    return { sub, organizationId };
  } catch {
    return null;
  }
}
