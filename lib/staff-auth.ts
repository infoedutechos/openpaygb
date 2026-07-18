import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { verifyStaffJwt, type StaffJwtPayload } from "@/lib/staff-jwt-verify";
import { jwtSecretStudentBytes } from "@/lib/jwt-secrets";

const COOKIE = "odelhub_staff";

function getSecret(): Uint8Array {
  const secret = jwtSecretStudentBytes();
  if (!secret) {
    throw new Error("JWT_SECRET_STUDENT or JWT_SECRET must be set (min 16 chars)");
  }
  return secret;
}

export type { StaffJwtPayload };

export async function signStaffToken(payload: StaffJwtPayload, maxAgeSec = 60 * 60 * 24 * 7) {
  return new SignJWT({ organizationId: payload.organizationId, typ: "staff" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getSecret());
}

export async function getStaffFromCookies(): Promise<StaffJwtPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyStaffJwt(token);
}

export function staffCookieName() {
  return COOKIE;
}
