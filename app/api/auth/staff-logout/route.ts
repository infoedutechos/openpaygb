import { NextResponse } from "next/server";
import { staffCookieName } from "@/lib/staff-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(staffCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
