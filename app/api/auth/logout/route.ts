import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";
import { ADMIN_SESSION_COOKIE_NAME, ADMIN_ITEM_COOKIE_NAME } from "@/utils/admin-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(ADMIN_ITEM_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
