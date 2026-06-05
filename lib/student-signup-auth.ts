import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { jwtSecretStudentBytes } from "@/lib/jwt-secrets";

const COOKIE = "odelhub_student_signup";
const TYP = "student_signup_v1";

function getSecret(): Uint8Array {
  const secret = jwtSecretStudentBytes();
  if (!secret) {
    throw new Error("JWT_SECRET_STUDENT or JWT_SECRET must be set (min 16 chars)");
  }
  return secret;
}

export function studentSignupCookieName() {
  return COOKIE;
}

/** Short-lived cookie after email link is opened; `tid` is `StudentSignupToken` id. */
export async function signStudentSignupSession(signupTokenId: string, maxAgeSec = 60 * 30) {
  return new SignJWT({ typ: TYP, tid: signupTokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getSecret());
}

export async function verifyStudentSignupSession(token: string): Promise<{ tid: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.typ !== TYP || typeof payload.tid !== "string") return null;
    return { tid: payload.tid };
  } catch {
    return null;
  }
}

export async function getStudentSignupSessionFromCookies(): Promise<{ tid: string } | null> {
  const jar = await cookies();
  const v = jar.get(COOKIE)?.value;
  if (!v) return null;
  return verifyStudentSignupSession(v);
}
