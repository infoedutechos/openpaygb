import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

const CreateAdminBody = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  name: z.string().max(120).optional().default(""),
  organizationId: z.string().min(1),
});

export async function POST(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = CreateAdminBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { id: true, tenantStatus: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (org.tenantStatus !== "active") {
    return NextResponse.json(
      { error: "Organization must be active before assigning an org admin" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An admin with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const admin = await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name.trim(),
      role: AdminRole.org_admin,
      organizationId: parsed.data.organizationId,
    },
    select: { id: true, email: true, name: true, role: true, organizationId: true },
  });

  return NextResponse.json({ admin }, { status: 201 });
}
