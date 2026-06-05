import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { isTransientMongoError, withPrismaRetry } from "@/lib/prisma-retry";

export type MasterSessionUser = {
  id: string;
  email: string;
  name: string;
};

export async function requireMaster(): Promise<
  | { ok: true; user: MasterSessionUser }
  | { ok: false; response: NextResponse }
> {
  const jwt = await getAdminFromCookies();
  if (!jwt) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (jwt.role !== "master") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  try {
    const user = await withPrismaRetry(() =>
      prisma.adminUser.findUnique({
        where: { id: jwt.sub },
        select: { id: true, email: true, name: true, role: true },
      }),
    );
    if (!user || user.role !== "master") {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
  } catch (e) {
    if (isTransientMongoError(e)) {
      return {
        ok: false,
        response: apiErrorResponse(e, {
          route: "requireMaster",
          fallback: "Database temporarily unavailable",
        }),
      };
    }
    throw e;
  }
}
