import { linksForSupport, type PublicSiteUiSettings } from "@/lib/site-ui-shared";

export type SupportPanelView = {
  socialLinks: ReturnType<typeof linksForSupport>;
  supportPhoneDisplay: string;
  supportPhoneHref: string;
  supportEmail: string | null;
  communitySupportUrl: string | null;
  showSupportPhone: boolean;
  showSupportEmail: boolean;
  showCommunitySupport: boolean;
};

export function buildSupportPanelView(platform: PublicSiteUiSettings): SupportPanelView {
  let socialLinks = linksForSupport(platform.socialLinks);
  const communityUrl = platform.communitySupportUrl?.trim() || null;
  if (communityUrl) {
    socialLinks = socialLinks.filter((l) => l.key !== "whatsapp_group");
  }

  return {
    socialLinks,
    supportPhoneDisplay: platform.supportPhone.trim() || "0800 117 000",
    supportPhoneHref: `tel:${(platform.supportPhone || "0800117000").replace(/\s/g, "")}`,
    supportEmail: platform.supportEmail.trim() || null,
    communitySupportUrl: communityUrl,
    showSupportPhone: platform.showSupportPhone !== false,
    showSupportEmail: platform.showSupportEmail !== false,
    showCommunitySupport: platform.showCommunitySupport !== false,
  };
}
