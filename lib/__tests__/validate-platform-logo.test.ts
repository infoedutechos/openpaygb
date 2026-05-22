import { describe, expect, it } from "vitest";
import { platformLogoContentType, validatePlatformLogoBuffer } from "@/lib/validate-platform-logo";

describe("validatePlatformLogoBuffer", () => {
  it("accepts PNG magic bytes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    expect(validatePlatformLogoBuffer(buf)).toEqual({ ok: true });
    expect(platformLogoContentType(buf)).toBe("image/png");
  });

  it("rejects empty", () => {
    expect(validatePlatformLogoBuffer(Buffer.alloc(0))).toEqual({ ok: false, reason: "Empty file." });
  });
});
