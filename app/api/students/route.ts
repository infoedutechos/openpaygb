import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAdminFromCookies } from "@/lib/auth";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { prisma } from "@/lib/prisma";

const CreateBody = z
  .object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().optional().default(""),
    telegramId: z.string().optional().default(""),
    programmeCode: z.string().min(2),
    year: z.number().int().min(1).max(6),
    semester: z.number().int().min(1).max(3),
    portalPassword: z.string().min(10).max(128).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.email?.trim() && !val.portalPassword?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Portal password (min 10 characters) is required when email is set",
        path: ["portalPassword"],
      });
    }
  });

export async function POST(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: admin.sub },
    select: { organizationId: true },
  });
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = adminUser.organizationId ?? (await getDefaultOrganizationId());

  const json = await req.json();
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const portalPasswordHash = data.portalPassword?.trim()
    ? await bcrypt.hash(data.portalPassword.trim(), 10)
    : undefined;
  const doc = await prisma.student.create({
    data: {
      organizationId,
      name: data.name,
      email: data.email ?? "",
      phone: data.phone,
      telegramId: data.telegramId,
      programmeCode: data.programmeCode.toUpperCase(),
      year: data.year,
      semester: data.semester,
      ...(portalPasswordHash ? { portalPasswordHash } : {}),
    },
  });
  return NextResponse.json(
    {
      student: {
        id: doc.id,
        name: doc.name,
        programmeCode: doc.programmeCode,
        year: doc.year,
        semester: doc.semester,
      },
    },
    { status: 201 }
  );
}

export async function GET(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
  const organizationSlug = url.searchParams.get("organizationSlug")?.trim().toLowerCase() ?? "";

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);

  let tenantFilter: { organizationId: string } | Record<string, never> = {};
  if (organizationSlug) {
    if (admin.role !== "master") {
      return NextResponse.json(
        { error: "organizationSlug filter is only available to platform masters" },
        { status: 403 }
      );
    }
    const org = await prisma.organization.findFirst({
      where: { slug: organizationSlug },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Unknown organization slug" }, { status: 400 });
    }
    tenantFilter = { organizationId: org.id };
  }

  const students = await prisma.student.findMany({
    where: {
      ...orgWhere,
      ...tenantFilter,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { organization: { select: { slug: true, name: true } } },
  });

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      telegramId: s.telegramId,
      programmeCode: s.programmeCode,
      year: s.year,
      semester: s.semester,
      createdAt: s.createdAt,
      organizationSlug: s.organization.slug,
      organizationName: s.organization.name,
    })),
  });
}
