import { describe, expect, it } from "vitest";
import { buildSharePayload, shareChannelUrl } from "@/lib/social-share";

describe("social-share", () => {
  it("builds telegram share url", () => {
    const payload = buildSharePayload("https://example.com/pay", {
      title: "ODELPay HUB",
      text: "Pay tuition with TON",
    });
    const url = shareChannelUrl("telegram", payload);
    expect(url).toContain("t.me/share/url");
    expect(url).toContain(encodeURIComponent("https://example.com/pay"));
  });

  it("builds whatsapp share url", () => {
    const payload = buildSharePayload("https://example.com", { text: "Hello" });
    const url = shareChannelUrl("whatsapp", payload);
    expect(url).toContain("wa.me");
  });
});
