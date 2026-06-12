import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtSecretAdminBytes } from "@/lib/jwt-secrets";

export const DEVELOPER_SESSION_COOKIE = "odelhub_developer";
const SESSION_DAYS = 14;

export type DeveloperSessionPayload = {
  appId: string;
  clientId: string;
};

function secretBytes(): Uint8Array | null {
  return jwtSecretAdminBytes();
}

export async function signDeveloperSession(payload: DeveloperSessionPayload): Promise<string | null> {
  const secret = secretBytes();
  if (!secret) return null;
  return new SignJWT({ clientId: payload.clientId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.appId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function verifyDeveloperSession(token: string): Promise<DeveloperSessionPayload | null> {
  try {
    const secret = secretBytes();
    if (!secret) return null;
    const { payload } = await jwtVerify(token, secret);
    const appId = typeof payload.sub === "string" ? payload.sub : null;
    const clientId = typeof payload.clientId === "string" ? payload.clientId : null;
    if (!appId || !clientId) return null;
    return { appId, clientId };
  } catch {
    return null;
  }
}

export async function readDeveloperSessionFromCookies(): Promise<DeveloperSessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(DEVELOPER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyDeveloperSession(token);
}

export function setDeveloperSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(DEVELOPER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearDeveloperSessionCookie(res: NextResponse): void {
  res.cookies.delete(DEVELOPER_SESSION_COOKIE);
}
