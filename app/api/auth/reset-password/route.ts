import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken } from "@/lib/admin-password-reset";

const Body = z.object({
  token: z.string().min(16),
  password: z.string().min(10),
});

export async function POST(req: Request) {
  try {
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

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: row.adminUserId },
        data: { passwordHash },
      }),
      prisma.adminPasswordResetToken.deleteMany({ where: { adminUserId: row.adminUserId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/reset-password]", e);
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
