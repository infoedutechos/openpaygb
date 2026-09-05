/** Shared ads platform types (Phase 1+). */

export const AD_ADVERTISER_KINDS = [
  "master",
  "organization",
  "user",
  "partner",
  "staff",
] as const;
export type AdAdvertiserKind = (typeof AD_ADVERTISER_KINDS)[number];

export const AD_CAMPAIGN_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "scheduled",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;
export type AdCampaignStatus = (typeof AD_CAMPAIGN_STATUSES)[number];

export const AD_PLACEMENT_SURFACES = [
  "web_dashboard",
  "web_hub",
  "telegram_bot",
  "telegram_channel",
  "telegram_mini_app",
] as const;
export type AdPlacementSurface = (typeof AD_PLACEMENT_SURFACES)[number];

export const AD_CREATIVE_FORMATS = ["text", "image", "video", "carousel"] as const;
export type AdCreativeFormat = (typeof AD_CREATIVE_FORMATS)[number];

/** Multi-dimensional targeting stored as JSON on AdCampaign.targetingJson */
export type AdTargeting = {
  hubs?: string[];
  roles?: string[];
  organizationIds?: string[];
  institutionTiers?: string[];
  geoCountries?: string[];
  telegramOnly?: boolean;
  webOnly?: boolean;
};

export const DEFAULT_AD_PLACEMENTS: {
  code: string;
  title: string;
  description: string;
  surface: AdPlacementSurface;
  hub: string;
}[] = [
  {
    code: "web_hub_banner",
    title: "Hub banner",
    description: "Top-of-hub promotional strip",
    surface: "web_hub",
    hub: "all",
  },
  {
    code: "web_dashboard_sidebar",
    title: "Dashboard sidebar",
    description: "Account dashboard promo slot",
    surface: "web_dashboard",
    hub: "all",
  },
  {
    code: "web_schools_dashboard",
    title: "Schools dashboard",
    description: "School admin dashboard placement",
    surface: "web_dashboard",
    hub: "schools",
  },
  {
    code: "telegram_bot_dm",
    title: "Telegram bot DM",
    description: "Sponsored message via user bot chats",
    surface: "telegram_bot",
    hub: "all",
  },
  {
    code: "telegram_channel",
    title: "Telegram channel",
    description: "Announcement channel sponsored post",
    surface: "telegram_channel",
    hub: "all",
  },
  {
    code: "telegram_mini_app",
    title: "Telegram Mini App",
    description: "In-TMA sponsored card",
    surface: "telegram_mini_app",
    hub: "play",
  },
];
