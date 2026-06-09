import { NextResponse } from "next/server";
import type { AdminRole } from "@prisma/client";
import { z } from "zod";
import { signAdminToken, cookieName as adminCookieName } from "@/lib/auth";
import { signStudentToken, studentCookieName } from "@/lib/student-auth";
import { recordAdminLogin, recordStudentLogin } from "@/lib/record-login";
import {
  buildTmaMe,
  findAdminByTelegramId,
  findStudentByTelegramId,
  parseTelegramUserFromInitData,
} from "@/lib/tma-session";
import { isTelegramAuthBypassed } from "@/utils/server-checks";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  initData: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "initData required" }, { status: 400 });
    }

    const bypass = isTelegramAuthBypassed() && parsed.data.initData === "dev-bypass";
    const tgUser = bypass
      ? { id: "0", firstName: "Preview", username: "preview" as string | null }
      : parseTelegramUserFromInitData(parsed.data.initData);
    if (!tgUser) {
      return NextResponse.json({ error: "Invalid Telegram session" }, { status: 403 });
    }

    const linkedStudent = bypass ? null : await findStudentByTelegramId(tgUser.id);
    const linkedAdmin = bypass || linkedStudent ? null : await findAdminByTelegramId(tgUser.id);

    if (linkedStudent) {
      await recordStudentLogin(linkedStudent.studentId);
    } else if (linkedAdmin) {
      await recordAdminLogin(linkedAdmin.adminId);
    }

    const me = await buildTmaMe(parsed.data.initData, {
      studentId: linkedStudent?.studentId,
      organizationId: linkedStudent?.organizationId,
      adminId: linkedAdmin?.adminId,
    });
    const res = NextResponse.json({
      ...me,
      sessionEstablished: Boolean(linkedStudent || linkedAdmin),
      linkedAs: linkedStudent ? "student" : linkedAdmin ? linkedAdmin.role : null,
    });

    if (linkedStudent) {
      const token = await signStudentToken({
        sub: linkedStudent.studentId,
        organizationId: linkedStudent.organizationId,
      });
      res.cookies.set(studentCookieName(), token, {
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else if (linkedAdmin) {
      const token = await signAdminToken({
        sub: linkedAdmin.adminId,
        email: linkedAdmin.email,
        role: linkedAdmin.role as AdminRole,
      });
      res.cookies.set(adminCookieName(), token, {
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 8,
      });
    }

    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/tma/session", fallback: "Session failed" });
  }
}
