import { describe, expect, it } from "vitest";
import {
  activatePlayHubLaunchTarget,
  defaultPlayHubLaunchTargets,
  parsePlayHubLaunchTargets,
  upsertPlayHubLaunchTarget,
} from "@/lib/play-hub-launch-targets";

describe("play-hub-launch-targets", () => {
  it("defaults to built-in /clicker", () => {
    const targets = parsePlayHubLaunchTargets("[]");
    expect(targets).toHaveLength(1);
    expect(targets[0]!.url).toBe("/clicker");
    expect(targets[0]!.isActive).toBe(true);
  });

  it("activates exactly one target", () => {
    let list = defaultPlayHubLaunchTargets();
    list = upsertPlayHubLaunchTarget(list, {
      label: "Partner game",
      url: "https://example.com/game",
      kind: "external",
      activate: false,
    });
    expect(list.filter((t) => t.isActive)).toHaveLength(1);
    const partner = list.find((t) => t.label === "Partner game")!;
    list = activatePlayHubLaunchTarget(list, partner.id);
    expect(list.find((t) => t.isActive)?.id).toBe(partner.id);
    expect(list.filter((t) => t.isActive)).toHaveLength(1);
  });

  it("rejects invalid internal urls", () => {
    expect(() =>
      upsertPlayHubLaunchTarget(defaultPlayHubLaunchTargets(), {
        label: "bad",
        url: "https://evil.com",
        kind: "internal",
      }),
    ).toThrow(/Internal URL/);
  });
});
