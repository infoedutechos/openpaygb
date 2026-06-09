import "server-only";

import { getPublicSiteUiSettings } from "@/lib/site-ui-settings";
import { absoluteUrl } from "@/lib/public-url";

export type CopilotAssistantContext = {
  assistantName: string;
  platformName: string;
  platformTagline: string;
  platformUrl: string;
};

let cache: CopilotAssistantContext | null = null;

export async function getCopilotAssistantContext(): Promise<CopilotAssistantContext> {
  if (cache) return cache;

  let assistantName = "ODEL HUB Copilot";
  let platformName = "ODEL HUB";
  let platformTagline =
    "Tuition payments, school workspaces, TON settlement, Play & Dex — one platform for schools and students.";

  try {
    const site = await getPublicSiteUiSettings();
    platformName = site.shareDefaultTitle?.trim() || platformName;
    platformTagline =
      site.homeScreenDescription?.trim() ||
      site.shareDefaultText?.trim() ||
      site.footerIntro?.trim() ||
      platformTagline;
    if (site.copilotAssistantName?.trim()) {
      assistantName = site.copilotAssistantName.trim();
    }
  } catch {
    // defaults
  }

  cache = {
    assistantName,
    platformName,
    platformTagline,
    platformUrl: absoluteUrl("/"),
  };
  return cache;
}

export function invalidateCopilotAssistantContext(): void {
  cache = null;
}

export function buildCopilotIntro(ctx: CopilotAssistantContext): string {
  return `Hi — I'm **${ctx.assistantName}** on ${ctx.platformName}. Ask about tuition, school registration, payments, or URAPearls. I'll point you to the right page with links when I can.`;
}
