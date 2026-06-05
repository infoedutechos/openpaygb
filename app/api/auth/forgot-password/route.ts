import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { sendAdminPasswordResetEmail } from "@/lib/admin-password-reset-email";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  email: z.string().email(),
});

const GENERIC = "If an account exists for this email, password reset instructions have been sent.";

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`auth-forgot:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
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
    return apiErrorResponse(e, { route: "auth/forgot-password", fallback: "Server error" });
  }
}
