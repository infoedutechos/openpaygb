import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAdminToken, cookieName } from "@/lib/auth";
import { ADMIN_REMEMBER_MAX_AGE_SEC, ADMIN_SESSION_MAX_AGE_SEC } from "@/lib/admin-password-reset";
import { getPlatformAuthPolicy } from "@/lib/platform-customisation";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { recordAdminLogin } from "@/lib/record-login";
import { revalidateAdminProfile } from "@/lib/cached-admin-profile";
import { ADMIN_SESSION_COOKIE_NAME, ADMIN_ITEM_COOKIE_NAME } from "@/utils/admin-session";

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
    const admin = await withPrismaRetry(() =>
      prisma.adminUser.findUnique({ where: { email } }),
    );
    const isDev = process.env.NODE_ENV === "development";
    const seedEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@odelhub.local").trim().toLowerCase();
    const uwaisEmail = (process.env.SEED_UWAIS_ADMIN_EMAIL ?? "uwais.admin@odelhub.local").trim().toLowerCase();

    if (!admin) {
      const body: Record<string, string> = { error: "Invalid credentials" };
      if (isDev) {
        body.code = "USER_NOT_FOUND";
        if (email.includes("uwais") || email === uwaisEmail) {
          body.hint = `No Uwais admin for "${email}". Run npm run seed:uwais, then use the email/password printed in the seed output (default ${uwaisEmail}).`;
        } else if (email !== seedEmail) {
          body.hint = `No admin for "${email}". For schools use ${uwaisEmail} after npm run seed:uwais. Master SEED_ADMIN_EMAIL is "${seedEmail}".`;
        } else {
          body.hint = `No admin for "${email}". Run npm run admin:ensure or npm run seed, then sign in with SEED_ADMIN_PASSWORD from .env.local.`;
        }
      }
      return NextResponse.json(body, { status: 401 });
    }
    const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!ok) {
      const body: Record<string, string> = { error: "Invalid credentials" };
      if (isDev) {
        body.code = "BAD_PASSWORD";
        body.hint =
          email.includes("uwais") || email === uwaisEmail
            ? `Wrong password for "${email}". Re-run npm run seed:uwais and use the password it prints (SEED_UWAIS_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD).`
            : `Wrong password for "${email}". Run npm run admin:ensure to sync the hash from SEED_ADMIN_PASSWORD in .env.local.`;
      }
      return NextResponse.json(body, { status: 401 });
    }
    await recordAdminLogin(admin.id);
    revalidateAdminProfile(admin.id);

    const policy = await getPlatformAuthPolicy();
    const maxAgeSec = parsed.data.rememberMe
      ? policy.adminRememberDays * 24 * 60 * 60
      : policy.adminSessionHours * 60 * 60;
    const resolvedMaxAge =
      maxAgeSec > 0 ? maxAgeSec : parsed.data.rememberMe ? ADMIN_REMEMBER_MAX_AGE_SEC : ADMIN_SESSION_MAX_AGE_SEC;
    const token = await signAdminToken(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      },
      resolvedMaxAge,
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
      maxAge: resolvedMaxAge,
    });
    // Clear URA shell cookies so dual-auth does not shadow tuition JWT.
    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    res.cookies.set(ADMIN_ITEM_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/login", fallback: "Server error" });
  }
}
