import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";

const Body = z.object({
  password: z.string().min(10).max(128),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
  }

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  const student = await prisma.student.findFirst({
    where: { id, ...orgWhere },
  });
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.student.update({
    where: { id },
    data: { portalPasswordHash: passwordHash },
  });

  return NextResponse.json({ ok: true });
}
