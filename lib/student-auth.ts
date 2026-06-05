import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { verifyStudentJwt, type StudentJwtPayload } from "@/lib/student-jwt-verify";
import { jwtSecretStudentBytes } from "@/lib/jwt-secrets";

const COOKIE = "odelhub_student";

function getSecret(): Uint8Array {
  const secret = jwtSecretStudentBytes();
  if (!secret) {
    throw new Error("JWT_SECRET_STUDENT or JWT_SECRET must be set (min 16 chars)");
  }
  return secret;
}

export type { StudentJwtPayload };

export async function signStudentToken(payload: StudentJwtPayload, maxAgeSec = 60 * 60 * 24 * 7) {
  return new SignJWT({ organizationId: payload.organizationId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getSecret());
}

export async function getStudentFromCookies(): Promise<StudentJwtPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyStudentJwt(token);
}

export function studentCookieName() {
  return COOKIE;
}
