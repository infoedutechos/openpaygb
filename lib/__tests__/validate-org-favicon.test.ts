import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { orgFaviconContentType, validateOrgFaviconBuffer } from "../validate-org-favicon";

describe("validateOrgFaviconBuffer", () => {
  it("accepts ICO magic", () => {
    const buf = Buffer.alloc(48, 0);
    buf.writeUInt16LE(0, 0);
    buf.writeUInt16LE(1, 2);
    buf.writeUInt16LE(1, 4);
    expect(validateOrgFaviconBuffer(buf)).toEqual({ ok: true });
    expect(orgFaviconContentType(buf)).toBe("image/x-icon");
  });

  it("accepts PNG magic", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3, 4, 5]);
    expect(validateOrgFaviconBuffer(buf)).toEqual({ ok: true });
    expect(orgFaviconContentType(buf)).toBe("image/png");
  });

  it("rejects arbitrary bytes", () => {
    expect(validateOrgFaviconBuffer(Buffer.from("hello"))?.ok).toBe(false);
  });
});
