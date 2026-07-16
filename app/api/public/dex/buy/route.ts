import { NextResponse } from "next/server";

/** Guest buy queues were non-settling operational placeholders; require the funded student ledger. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Sign in to buy crypto from your OPGB balance.",
      code: "student_login_required",
      loginPath: "/student/login",
    },
    { status: 401 },
  );
}
