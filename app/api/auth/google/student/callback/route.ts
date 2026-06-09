import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import {
  COOKIE_GOAUTH_INTENT,
  COOKIE_GOAUTH_STATE,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getGoogleOAuthRedirectUri,
} from "@/lib/google-oauth-student";
import { signStudentSignupSession, studentSignupCookieName } from "@/lib/student-signup-auth";
import { signStudentToken, studentCookieName } from "@/lib/student-auth";
import { recordStudentLogin } from "@/lib/record-login";

function clearGoauthCookies(res: NextResponse) {
  const secure = process.env.NODE_ENV === "production";
  const z = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 0 };
  res.cookies.set(COOKIE_GOAUTH_STATE, "", z);
  res.cookies.set(COOKIE_GOAUTH_INTENT, "", z);
}

function failRedirect(origin: string, path: "/student/login" | "/student/register", msg: string) {
  const u = new URL(path, origin);
  u.searchParams.set("error", msg);
  const res = NextResponse.redirect(u.toString());
  clearGoauthCookies(res);
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || url.origin).trim();
  const redirectUri = getGoogleOAuthRedirectUri(origin);

  const qpError = url.searchParams.get("error");
  if (qpError) {
    return failRedirect(origin, "/student/login", "Google sign-in was cancelled");
  }

  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const jar = await cookies();
  const savedState = jar.get(COOKIE_GOAUTH_STATE)?.value;
  const intent = jar.get(COOKIE_GOAUTH_INTENT)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return failRedirect(origin, "/student/register", "Invalid or expired sign-in session — try again");
  }
  if (intent !== "register" && intent !== "login") {
    return failRedirect(origin, "/student/register", "Invalid sign-in session");
  }

  const exchanged = await exchangeGoogleCode(code, redirectUri);
  if (!exchanged) {
    return failRedirect(origin, "/student/register", "Could not verify with Google — try again");
  }

  const profile = await fetchGoogleUserInfo(exchanged.access_token);
  if (!profile) {
    return failRedirect(origin, "/student/register", "Could not read Google profile");
  }

  if (intent === "login") {
    const matches = await prisma.student.findMany({
      where: { googleSub: profile.sub },
      take: 5,
    });

    if (matches.length === 0) {
      const r = failRedirect(origin, "/student/register", "No account for this Google profile — register first");
      return r;
    }
    if (matches.length > 1) {
      return failRedirect(
        origin,
        "/student/login",
        "Multiple accounts use this Google login — contact your school"
      );
    }

    const student = matches[0];
    await recordStudentLogin(student.id);
    const token = await signStudentToken({ sub: student.id, organizationId: student.organizationId });
    const res = NextResponse.redirect(new URL("/student", origin).toString());
    clearGoauthCookies(res);
    res.cookies.set(studentCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  // register: same post-verify path as email — verified immediately, pick school on /student/guest
  await prisma.studentSignupToken.deleteMany({
    where: { email: profile.email, consumedAt: null },
  });

  const plain = newAdminResetTokenPlain();
  const tokenHash = hashAdminResetToken(plain);
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const row = await prisma.studentSignupToken.create({
    data: {
      tokenHash,
      email: profile.email,
      name: profile.name,
      passwordHash,
      googleSub: profile.sub,
      expiresAt,
      verifiedAt: new Date(),
    },
  });

  const sessionJwt = await signStudentSignupSession(row.id);
  const res = NextResponse.redirect(new URL("/student/guest", origin).toString());
  clearGoauthCookies(res);
  res.cookies.set(studentSignupCookieName(), sessionJwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}
