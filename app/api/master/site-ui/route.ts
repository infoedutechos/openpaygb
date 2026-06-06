import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import {
  MasterSiteUiPatchSchema,
  PLATFORM_SITE_UI_KEY,
  getPlatformSiteUiSettings,
  invalidatePublicSiteUiCache,
  mergeSocialLinks,
} from "@/lib/site-ui-settings";

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const settings = await getPlatformSiteUiSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = MasterSiteUiPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const socialLinks = mergeSocialLinks(body.socialLinks);

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      socialLinks,
      shareEnabled: body.shareEnabled,
      shareDefaultTitle: body.shareDefaultTitle,
      shareDefaultText: body.shareDefaultText,
      supportPhone: body.supportPhone,
      supportEmail: body.supportEmail,
      communitySupportUrl: body.communitySupportUrl,
      showSupportPhone: body.showSupportPhone,
      showSupportEmail: body.showSupportEmail,
      showCommunitySupport: body.showCommunitySupport,
      footerIntro: body.footerIntro,
      footerMode: body.footerMode,
      footerPathList: body.footerPathList,
      footerShowQuickLinks: body.footerShowQuickLinks,
      footerCopyrightVisible: body.footerCopyrightVisible,
      homeScreenEnabled: body.homeScreenEnabled,
      homeScreenShowOnHome: body.homeScreenShowOnHome,
      homeScreenTitle: body.homeScreenTitle,
      homeScreenShortName: body.homeScreenShortName,
      homeScreenDescription: body.homeScreenDescription,
      homeScreenThemeColor: body.homeScreenThemeColor,
    },
    update: {
      socialLinks,
      shareEnabled: body.shareEnabled,
      shareDefaultTitle: body.shareDefaultTitle,
      shareDefaultText: body.shareDefaultText,
      supportPhone: body.supportPhone,
      supportEmail: body.supportEmail,
      communitySupportUrl: body.communitySupportUrl,
      showSupportPhone: body.showSupportPhone,
      showSupportEmail: body.showSupportEmail,
      showCommunitySupport: body.showCommunitySupport,
      footerIntro: body.footerIntro,
      footerMode: body.footerMode,
      footerPathList: body.footerPathList,
      footerShowQuickLinks: body.footerShowQuickLinks,
      footerCopyrightVisible: body.footerCopyrightVisible,
      homeScreenEnabled: body.homeScreenEnabled,
      homeScreenShowOnHome: body.homeScreenShowOnHome,
      homeScreenTitle: body.homeScreenTitle,
      homeScreenShortName: body.homeScreenShortName,
      homeScreenDescription: body.homeScreenDescription,
      homeScreenThemeColor: body.homeScreenThemeColor,
    },
  });

  invalidatePublicSiteUiCache();
  const settings = await getPlatformSiteUiSettings();
  return NextResponse.json(settings);
}
