import { describe, expect, it } from "vitest";
import { LOGIN_CHOOSER_CARDS, LOGIN_CHOOSER_PATH } from "@/lib/login-entry";

describe("login chooser", () => {
  it("exposes four audience cards with the expected titles", () => {
    expect(LOGIN_CHOOSER_PATH).toBe("/login");
    expect(LOGIN_CHOOSER_CARDS.map((c) => c.title)).toEqual([
      "Student Login for Schools",
      "Student Login for Higher Institutions",
      "Admin Login for Schools",
      "Admin Login for Higher Institutions",
    ]);
    expect(LOGIN_CHOOSER_CARDS.every((c) => c.guideHref.startsWith("/help/"))).toBe(true);
  });
});
