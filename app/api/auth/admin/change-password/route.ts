import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { revalidateAdminProfile } from "@/lib/cached-admin-profile";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import {
  enforceDemoPasswordChange,
  syncDemoPasswordToMac,
} from "@/lib/demo-password-policy";

const Body = z.object({
  currentPassword: z.string().min(1).max(500),
  newPassword: z.string().min(10).max(200),
});

export async function POST(req: Request) {
  const session = await getAdminFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  if (rateLimitHit(`admin-change-pw:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body. New password must be at least 10 characters." },
      { status: 400 },
    );
  }

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return NextResponse.json({ error: "New password must differ from your current password." }, { status: 400 });
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!admin) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const gate = await enforceDemoPasswordChange({ kind: "admin", email: admin.email });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash },
  });
  revalidateAdminProfile(admin.id);

  if (gate.slot) {
    await syncDemoPasswordToMac({
      slotKey: gate.slot,
      password: parsed.data.newPassword,
      updatedBy: admin.email,
    });
  }

  return NextResponse.json({ ok: true });
}
