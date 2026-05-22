import { NextResponse } from "next/server";
import { studentCookieName } from "@/lib/student-auth";
import { studentSignupCookieName } from "@/lib/student-signup-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(studentCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set(studentSignupCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
