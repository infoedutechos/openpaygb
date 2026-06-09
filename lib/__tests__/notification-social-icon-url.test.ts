import { describe, expect, it } from "vitest";
import {
  notificationSocialIconUrl,
  resolveNotificationSocialIconUrl,
} from "@/lib/notification-social-icon-url";

describe("notification-social-icon-url", () => {
  it("builds same-origin icon url", () => {
    expect(notificationSocialIconUrl("linkedin")).toBe(
      "/api/notification-social-icon?id=linkedin",
    );
  });

  it("rewrites legacy simpleicons cdn urls", () => {
    expect(
      resolveNotificationSocialIconUrl("https://cdn.simpleicons.org/linkedin/0A66C2"),
    ).toBe("/api/notification-social-icon?id=linkedin");
  });
});
