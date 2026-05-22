import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSignupSessionFromCookies } from "@/lib/student-signup-auth";

/** Current pending signup (after email verified, before school is chosen). */
export async function GET() {
  const sess = await getStudentSignupSessionFromCookies();
  if (!sess) {
    return NextResponse.json({ signup: null }, { status: 401 });
  }

  const row = await prisma.studentSignupToken.findUnique({
    where: { id: sess.tid },
    select: {
      email: true,
      name: true,
      verifiedAt: true,
      consumedAt: true,
      expiresAt: true,
    },
  });

  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ signup: null }, { status: 401 });
  }
  if (!row.verifiedAt) {
    return NextResponse.json({ signup: null, reason: "not_verified" }, { status: 401 });
  }

  return NextResponse.json({
    signup: { email: row.email, name: row.name },
  });
}
