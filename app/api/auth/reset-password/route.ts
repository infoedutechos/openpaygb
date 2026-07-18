import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken } from "@/lib/admin-password-reset";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import {
  enforceDemoPasswordChange,
  syncDemoPasswordToMac,
} from "@/lib/demo-password-policy";

const Body = z.object({
  token: z.string().min(16),
  password: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`auth-reset:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token or password (min. 10 characters)." }, { status: 400 });
    }

    const tokenHash = hashAdminResetToken(parsed.data.token);

    const row = await prisma.adminPasswordResetToken.findUnique({
      where: { tokenHash },
      include: { adminUser: true },
    });

    if (!row || row.expiresAt < new Date()) {
      return NextResponse.json({ error: "Reset link is invalid or has expired. Request a new one." }, { status: 400 });
    }

    const gate = await enforceDemoPasswordChange({
      kind: "admin",
      email: row.adminUser.email,
    });
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: row.adminUserId },
        data: { passwordHash },
      }),
      prisma.adminPasswordResetToken.deleteMany({ where: { adminUserId: row.adminUserId } }),
    ]);

    if (gate.slot) {
      await syncDemoPasswordToMac({
        slotKey: gate.slot,
        password: parsed.data.password,
        updatedBy: row.adminUser.email,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/reset-password", fallback: "Server error" });
  }
}
