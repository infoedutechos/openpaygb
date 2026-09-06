import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import {
  isSidebarIconId,
  MAC_SIDEBAR_NAV_KEYS,
  parseSidebarNavIconOverrides,
  SIDEBAR_ICON_IDS,
  SIDEBAR_ICON_LABELS,
} from "@/lib/sidebar-nav-icon-overrides";
import { apiErrorResponse } from "@/lib/api-error";

async function requireMaster() {
  const admin = await getAdminFromCookies();
  if (!admin || admin.role !== "master") return null;
  return admin;
}

export async function GET() {
  try {
    if (!(await requireMaster())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const row = await prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: { sidebarNavIconOverrides: true },
    });
    return NextResponse.json({
      overrides: parseSidebarNavIconOverrides(row?.sidebarNavIconOverrides),
      catalog: SIDEBAR_ICON_IDS.map((id) => ({ id, label: SIDEBAR_ICON_LABELS[id] })),
      navKeys: MAC_SIDEBAR_NAV_KEYS,
    });
  } catch (e) {
    if (String(e).includes("sidebarNavIconOverrides") || String(e).includes("Unknown field")) {
      return NextResponse.json({
        overrides: {},
        catalog: SIDEBAR_ICON_IDS.map((id) => ({ id, label: SIDEBAR_ICON_LABELS[id] })),
        navKeys: MAC_SIDEBAR_NAV_KEYS,
        warning: "Run prisma db push to enable persisted icon overrides.",
      });
    }
    return apiErrorResponse(e, { route: "GET /api/master/sidebar-nav-icons" });
  }
}

const PatchBody = z.object({
  overrides: z.record(z.string(), z.string()),
});

export async function PATCH(req: Request) {
  try {
    if (!(await requireMaster())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.data.overrides)) {
      if (!k.trim()) continue;
      if (isSidebarIconId(v)) cleaned[k.trim()] = v;
    }
    await prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: { key: PLATFORM_SITE_UI_KEY, sidebarNavIconOverrides: cleaned },
      update: { sidebarNavIconOverrides: cleaned },
    });
    return NextResponse.json({ overrides: cleaned });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/sidebar-nav-icons" });
  }
}
