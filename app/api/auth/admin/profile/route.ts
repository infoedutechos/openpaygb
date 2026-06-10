import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { revalidateAdminProfile } from "@/lib/cached-admin-profile";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function PATCH(req: Request) {
  try {
    const session = await getAdminFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Name must be 1–120 characters." }, { status: 400 });
    }

    const updated = await prisma.adminUser.update({
      where: { id: session.sub },
      data: { name: parsed.data.name },
      select: {
        id: true,
        name: true,
        profileImageUploadedAt: true,
      },
    });

    revalidateAdminProfile(session.sub);

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      hasProfileImage: Boolean(updated.profileImageUploadedAt),
      profileImageUrl: updated.profileImageUploadedAt
        ? `/api/auth/admin/profile-image?v=${updated.profileImageUploadedAt.getTime()}`
        : null,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/admin/profile PATCH", fallback: "Could not update profile" });
  }
}
