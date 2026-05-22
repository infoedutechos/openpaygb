import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";

/** Lightweight session probe — always 200 so public pages avoid 401 noise in DevTools. */
export async function GET() {
  const session = await getStudentFromCookies();
  return NextResponse.json({ signedIn: Boolean(session) });
}
