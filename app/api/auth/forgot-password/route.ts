import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { sendAdminPasswordResetEmail } from "@/lib/admin-password-reset-email";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { enforceDemoPasswordChange } from "@/lib/demo-password-policy";

const Body = z.object({
  email: z.string().email(),
});

const SENT =
  "This email is registered. We sent a secure reset link — it expires in one hour.";
const NOT_REGISTERED = "No admin account is registered with this email address.";

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

    const admin = await withPrismaRetry(() =>
      prisma.adminUser.findUnique({
        where: { email: emailLower },
      }),
    );

    if (!admin) {
      return NextResponse.json({ error: NOT_REGISTERED, registered: false }, { status: 404 });
    }

    const gate = await enforceDemoPasswordChange({ kind: "admin", email: admin.email });
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error, registered: true }, { status: gate.status });
    }

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

    return NextResponse.json({ ok: true, registered: true, message: SENT });
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/forgot-password", fallback: "Server error" });
  }
}
