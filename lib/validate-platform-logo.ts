const MAX_BYTES = 512 * 1024;

export type PlatformLogoContentType = "image/png" | "image/jpeg" | "image/webp" | "image/x-icon";

export function validatePlatformLogoBuffer(buf: Buffer): { ok: true } | { ok: false; reason: string } {
  if (buf.length === 0) return { ok: false, reason: "Empty file." };
  if (buf.length > MAX_BYTES) {
    return { ok: false, reason: `Logo must be ${MAX_BYTES / 1024}KB or smaller.` };
  }

  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const webp =
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50;
  const ico = buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0;

  if (!png && !jpeg && !webp && !ico) {
    return { ok: false, reason: "Upload PNG, JPEG, WebP, or ICO." };
  }
  return { ok: true };
}

export function platformLogoContentType(buf: Buffer): PlatformLogoContentType {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return "image/webp";
  }
  return "image/x-icon";
}
