import { NextResponse } from "next/server";
import { hashAdminResetToken } from "@/lib/admin-password-reset";
import { prisma } from "@/lib/prisma";
import { signStudentSignupSession, studentSignupCookieName } from "@/lib/student-signup-auth";

/**
 * Email confirmation entrypoint: validates token, marks verified, sets short-lived signup cookie, redirects to guest dashboard.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const plain = url.searchParams.get("token")?.trim();
  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/student/register?error=${encodeURIComponent(msg)}`, url.origin));

  if (!plain) {
    return fail("Missing confirmation token");
  }

  const tokenHash = hashAdminResetToken(plain);
  const row = await prisma.studentSignupToken.findUnique({
    where: { tokenHash },
  });

  if (!row) {
    return fail("Invalid or expired link");
  }
  if (row.consumedAt) {
    return fail("This link was already used");
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return fail("This link has expired — register again");
  }

  await prisma.studentSignupToken.update({
    where: { id: row.id },
    data: { verifiedAt: new Date() },
  });

  const sessionJwt = await signStudentSignupSession(row.id);
  const redirectUrl = new URL("/student/guest", req.url).toString();

  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(studentSignupCookieName(), sessionJwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}
