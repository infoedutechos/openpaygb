import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_EMOJI_LIBRARY,
  NOTIFICATION_SOCIAL_LOGO_LIBRARY,
  appendEmojiToText,
} from "@/lib/notification-content-libraries";

describe("notification-content-libraries", () => {
  it("exposes emoji categories with items", () => {
    expect(NOTIFICATION_EMOJI_LIBRARY.length).toBeGreaterThan(3);
    expect(NOTIFICATION_EMOJI_LIBRARY[0].emojis.length).toBeGreaterThan(0);
  });

  it("exposes social logo options with image URLs", () => {
    expect(NOTIFICATION_SOCIAL_LOGO_LIBRARY.some((l) => l.id === "telegram")).toBe(true);
    expect(NOTIFICATION_SOCIAL_LOGO_LIBRARY[0].imageUrl).toMatch(/^\/api\/notification-social-icon\?id=/);
  });

  it("appends emoji without duplicating", () => {
    expect(appendEmojiToText("Hello", "🎉")).toBe("Hello 🎉");
    expect(appendEmojiToText("Hello 🎉", "🎉")).toBe("Hello 🎉");
  });
});
