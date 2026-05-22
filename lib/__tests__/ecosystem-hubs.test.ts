import { describe, expect, it } from "vitest";
import { HUB_ORDER, HUBS, homeHubFromSearchParam, homeUrlForHub } from "@/lib/ecosystem/hubs";

describe("ecosystem hubs", () => {
  it("maps search params to hub keys", () => {
    expect(homeHubFromSearchParam("play")).toBe("play");
    expect(homeHubFromSearchParam("dex")).toBe("dex");
    expect(homeHubFromSearchParam("tuition")).toBe("tuition");
    expect(homeHubFromSearchParam(null)).toBe("tuition");
  });

  it("keeps stable hub order for UI", () => {
    expect(HUB_ORDER).toEqual(["tuition", "play", "dex"]);
  });

  it("builds home URLs", () => {
    expect(homeUrlForHub("tuition")).toBe("/?hub=tuition");
    expect(homeUrlForHub("play")).toBe("/?hub=play");
    expect(homeUrlForHub("dex")).toBe("/?hub=dex");
  });

  it("ties Play Hub to ura-pearl-data-center upstream metadata", () => {
    expect(HUBS.play.upstream?.github).toBe("https://github.com/urapearlug-sys/ura-pearl-data-center");
    expect(HUBS.play.upstream?.live).toMatch(/vercel\.app$/);
    expect(HUBS.play.upstream?.syncCommand).toBe("npm run sync:play-hub");
  });
});
