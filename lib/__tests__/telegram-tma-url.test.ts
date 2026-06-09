import { describe, expect, it } from "vitest";
import { getTmaAppUrl } from "@/lib/telegram/tma-url";
import { TMA_REPLY_KEYBOARD_ROUTES } from "@/lib/telegram/keyboards";

describe("telegram tma", () => {
  it("builds /tma url with optional start tab", () => {
    const url = getTmaAppUrl("pay");
    expect(url).toContain("/tma");
    expect(url).toContain("start=pay");
  });

  it("maps reply keyboard labels to tabs", () => {
    expect(TMA_REPLY_KEYBOARD_ROUTES["💳 OpenPay Card"]).toBe("card");
    expect(TMA_REPLY_KEYBOARD_ROUTES["🎓 Student Portal"]).toBe("home");
  });
});
