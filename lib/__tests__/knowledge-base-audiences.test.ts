import { describe, expect, it } from "vitest";
import { PlatformAudience } from "@prisma/client";
import { prismaAudiencesForHub } from "@/lib/knowledge-base/audiences";

describe("prismaAudiencesForHub", () => {
  it("returns only enum values known to Prisma client", () => {
    const audiences = prismaAudiencesForHub("all");
    for (const a of audiences) {
      expect(Object.values(PlatformAudience)).toContain(a);
    }
  });

  it("includes tuition for dex hub when dex enum may be absent", () => {
    const audiences = prismaAudiencesForHub("dex");
    expect(audiences).toContain(PlatformAudience.all);
    expect(audiences.length).toBeGreaterThan(0);
  });
});
