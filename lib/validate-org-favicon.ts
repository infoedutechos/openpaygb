const MAX_BYTES = 256 * 1024;

/** ICO: reserved 0 + type 1 (little-endian). PNG: common when sites use PNG data at favicon.ico. */
export function validateOrgFaviconBuffer(buf: Buffer): { ok: true } | { ok: false; reason: string } {
  if (buf.length === 0) return { ok: false, reason: "Empty file." };
  if (buf.length > MAX_BYTES) {
    return { ok: false, reason: `Favicon must be ${MAX_BYTES / 1024}KB or smaller.` };
  }

  const icoMagic = buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0;
  const pngMagic = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!icoMagic && !pngMagic) {
    return { ok: false, reason: "Upload a valid .ico file (or PNG used as favicon)." };
  }
  return { ok: true };
}

export function orgFaviconContentType(buf: Buffer): "image/x-icon" | "image/png" {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  return "image/x-icon";
}
