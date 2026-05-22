import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { sendAdminPasswordResetEmail } from "@/lib/admin-password-reset-email";

const Body = z.object({
  email: z.string().email(),
});

const GENERIC = "If an account exists for this email, password reset instructions have been sent.";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const emailLower = parsed.data.email.toLowerCase();

    const admin = await prisma.adminUser.findUnique({
      where: { email: emailLower },
    });

    if (admin) {
      await prisma.adminPasswordResetToken.deleteMany({ where: { adminUserId: admin.id } });

      const plainToken = newAdminResetTokenPlain();
      const tokenHash = hashAdminResetToken(plainToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.adminPasswordResetToken.create({
        data: {
          adminUserId: admin.id,
          tokenHash,
          expiresAt,
        },
      });

      await sendAdminPasswordResetEmail(admin.email, plainToken);
    }

    return NextResponse.json({ ok: true, message: GENERIC });
  } catch (e) {
    console.error("[auth/forgot-password]", e);
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
