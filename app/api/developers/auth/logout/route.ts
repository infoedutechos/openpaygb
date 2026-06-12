import { NextResponse } from "next/server";
import { clearDeveloperSessionCookie } from "@/lib/developer-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearDeveloperSessionCookie(res);
  return res;
}
