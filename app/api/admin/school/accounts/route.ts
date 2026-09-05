import { NextResponse } from "next/server";
import { z } from "zod";
import { SchoolAccountKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { ensureDefaultSchoolAccounts } from "@/lib/school-accounts-seed";

const CreateBody = z.object({
  organizationSlug: z.string().optional(),
  name: z.string().min(1).max(120),
  kind: z.nativeEnum(SchoolAccountKind).optional(),
  defaultAmountUgx: z.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug") ?? undefined;
    const auth = await requireSchoolAdminScope(organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureDefaultSchoolAccounts(auth.scope.organizationId);

    const kindParam = url.searchParams.get("kind");
    const kindFilter =
      kindParam === "income" || kindParam === "expenditure"
        ? (kindParam as SchoolAccountKind)
        : undefined;

    const accounts = await prisma.schoolAccount.findMany({
      where: {
        organizationId: auth.scope.organizationId,
        ...(kindFilter ? { kind: kindFilter } : {}),
      },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      context: auth.context,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        defaultAmountUgx: a.defaultAmountUgx ?? 0,
        sortOrder: a.sortOrder,
        enabled: a.enabled,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/accounts" });
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const account = await prisma.schoolAccount.create({
      data: {
        organizationId: auth.scope.organizationId,
        name: body.name.trim(),
        kind: body.kind ?? SchoolAccountKind.income,
        defaultAmountUgx: body.defaultAmountUgx ?? 0,
      },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        kind: account.kind,
        defaultAmountUgx: account.defaultAmountUgx,
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/accounts" });
  }
}
