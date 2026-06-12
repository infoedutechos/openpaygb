import { describe, expect, it } from "vitest";
import { defaultSocialLinkIconUrl, resolveSocialLinkIconUrl } from "@/lib/social-link-brand-icon";

describe("social-link-brand-icon", () => {
  it("maps built-in keys to notification icon URLs", () => {
    expect(defaultSocialLinkIconUrl("telegram_group")).toContain("telegram");
    expect(defaultSocialLinkIconUrl("twitter")).toContain("id=x");
    expect(defaultSocialLinkIconUrl("facebook")).toContain("facebook");
  });

  it("prefers custom icon URL when provided", () => {
    expect(resolveSocialLinkIconUrl("twitter", "/api/public/social-icon/twitter?v=1")).toBe(
      "/api/public/social-icon/twitter?v=1",
    );
  });
});
