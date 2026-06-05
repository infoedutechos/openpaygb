import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAdminToken, cookieName } from "@/lib/auth";
import { ADMIN_REMEMBER_MAX_AGE_SEC, ADMIN_SESSION_MAX_AGE_SEC } from "@/lib/admin-password-reset";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`auth-admin-login:${ip}`, 15, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
    }

    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    const isDev = process.env.NODE_ENV === "development";
    const seedEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@odelhub.local").trim().toLowerCase();

    if (!admin) {
      const body: Record<string, string> = { error: "Invalid credentials" };
      if (isDev) {
        body.code = "USER_NOT_FOUND";
        body.hint =
          email !== seedEmail
            ? `No admin for "${email}". Your .env.local SEED_ADMIN_EMAIL is "${seedEmail}". Use that email, or run npm run admin:ensure.`
            : `No admin for "${email}". Run npm run admin:ensure or npm run seed, then sign in with SEED_ADMIN_PASSWORD from .env.local.`;
      }
      return NextResponse.json(body, { status: 401 });
    }
    const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!ok) {
      const body: Record<string, string> = { error: "Invalid credentials" };
      if (isDev) {
        body.code = "BAD_PASSWORD";
        body.hint = `Wrong password for "${email}". Run npm run admin:ensure to sync the hash from SEED_ADMIN_PASSWORD in .env.local (not ADMIN_PASSWORD).`;
      }
      return NextResponse.json(body, { status: 401 });
    }
    const maxAgeSec = parsed.data.rememberMe ? ADMIN_REMEMBER_MAX_AGE_SEC : ADMIN_SESSION_MAX_AGE_SEC;
    const token = await signAdminToken(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      },
      maxAgeSec
    );
    const res = NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        organizationId: admin.organizationId,
      },
    });
    res.cookies.set(cookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAgeSec,
    });
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/login", fallback: "Server error" });
  }
}
