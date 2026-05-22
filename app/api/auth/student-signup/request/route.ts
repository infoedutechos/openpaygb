import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { sendStudentSignupEmail, studentSignupVerifyUrlForRequest } from "@/lib/student-signup-email";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const GENERIC = "If that email can receive mail, you will get a confirmation link shortly.";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`student-signup-req:${ip}`, 8, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid details", details: parsed.error.flatten() }, { status: 400 });
    }

    const emailLower = parsed.data.email.trim().toLowerCase();
    const name = parsed.data.name.trim();
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.studentSignupToken.deleteMany({
      where: { email: emailLower, consumedAt: null },
    });

    const plain = newAdminResetTokenPlain();
    const tokenHash = hashAdminResetToken(plain);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.studentSignupToken.create({
      data: {
        tokenHash,
        email: emailLower,
        name,
        passwordHash,
        expiresAt,
      },
    });

    const emailSent = await sendStudentSignupEmail(emailLower, plain);

    const payload: {
      ok: true;
      message: string;
      emailSent: boolean;
      /** Present only when email was not sent and `NODE_ENV` is not production — same-origin link to finish signup. */
      devConfirmUrl?: string;
    } = { ok: true, message: GENERIC, emailSent };
    if (!emailSent && process.env.NODE_ENV !== "production") {
      payload.devConfirmUrl = studentSignupVerifyUrlForRequest(req, plain);
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error("[student-signup/request]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
