import { describe, expect, it } from "vitest";
import { TELEGRAM_HUB_CHANNEL_DEFAULTS } from "@/lib/telegram-hub-settings";

describe("telegram-hub-settings defaults", () => {
  it("ships ODEL HUB official channel defaults", () => {
    expect(TELEGRAM_HUB_CHANNEL_DEFAULTS.name).toBe("ODEL HUB Official Channel");
    expect(TELEGRAM_HUB_CHANNEL_DEFAULTS.url).toBe("https://t.me/+quY6fGi9uHxhNjhk");
    expect(TELEGRAM_HUB_CHANNEL_DEFAULTS.channelId).toBe("-1003916461172");
  });
});
