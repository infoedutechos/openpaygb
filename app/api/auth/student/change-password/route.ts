import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentFromCookies } from "@/lib/student-auth";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  currentPassword: z.string().min(1).max(500),
  newPassword: z.string().min(10).max(200),
});

export async function POST(req: Request) {
  const session = await getStudentFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  if (rateLimitHit(`student-change-pw:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body. New password must be at least 10 characters." },
      { status: 400 }
    );
  }

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return NextResponse.json({ error: "New password must differ from your current password." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: session.sub },
    select: { id: true, organizationId: true, portalPasswordHash: true },
  });

  if (!student || student.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!student.portalPasswordHash) {
    return NextResponse.json(
      {
        error:
          "Portal password is not set on your account. Ask your school admin to set an initial portal password, or complete registration with a password.",
      },
      { status: 403 }
    );
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, student.portalPasswordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const portalPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.student.update({
    where: { id: student.id },
    data: { portalPasswordHash },
  });

  return NextResponse.json({ ok: true });
}
