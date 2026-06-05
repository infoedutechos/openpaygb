import type { AdminRole } from "@prisma/client";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { verifyPayAdminJwt } from "@/lib/admin-jwt-verify";
import { jwtSecretAdminBytes } from "@/lib/jwt-secrets";

const COOKIE = "odelhub_admin";

function getSecret(): Uint8Array {
  const secret = jwtSecretAdminBytes();
  if (!secret) {
    throw new Error("JWT_SECRET_ADMIN or JWT_SECRET must be set (min 16 chars)");
  }
  return secret;
}

export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: AdminRole;
};

export async function signAdminToken(payload: AdminJwtPayload, maxAgeSec = 60 * 60 * 8) {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  const p = await verifyPayAdminJwt(token);
  if (!p) return null;
  return { sub: p.sub, email: p.email, role: p.role as AdminRole };
}

export async function getAdminFromCookies(): Promise<AdminJwtPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function cookieName() {
  return COOKIE;
}
