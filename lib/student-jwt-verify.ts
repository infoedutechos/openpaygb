import { jwtVerify } from "jose";
import { jwtSecretStudentBytes } from "@/lib/jwt-secrets";

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
    const secret = jwtSecretStudentBytes();
    if (!secret) return null;
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
