import { describe, expect, it } from "vitest";
import { firstVisibleHomeShellHub, visibleHubKeys } from "@/lib/hub-visibility";

describe("hub visibility helpers", () => {
  it("lists visible hubs in order", () => {
    expect(
      visibleHubKeys({ tuition: false, play: true, dex: false, developers: true }),
    ).toEqual(["tuition", "dex"]);
  });

  it("picks first visible home-shell hub", () => {
    expect(firstVisibleHomeShellHub({ tuition: true, play: false, dex: false, developers: false })).toBe("play");
    expect(firstVisibleHomeShellHub({ tuition: true, play: true, dex: true, developers: false })).toBe(null);
  });
});
