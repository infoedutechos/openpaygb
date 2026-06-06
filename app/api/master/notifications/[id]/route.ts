import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).optional(),
  imageUrl: z.string().max(2000).optional().nullable(),
  videoUrl: z.string().max(2000).optional().nullable(),
  href: z.string().max(2000).optional().nullable(),
  audience: z.enum(["all", "tuition", "play", "admin"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const body = parsed.data;
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.body !== undefined) data.body = body.body.trim();
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl?.trim() ? body.imageUrl.trim() : null;
    if (body.videoUrl !== undefined) data.videoUrl = body.videoUrl?.trim() ? body.videoUrl.trim() : null;
    if (body.href !== undefined) data.href = body.href?.trim() ? body.href.trim() : null;
    if (body.audience !== undefined) data.audience = body.audience;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const notification = await prisma.notification.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      notification: {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/notifications/[id]" });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const { id } = await params;
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/master/notifications/[id]" });
  }
}
