/** Client-only: QR with high ECC and centered OPGB / platform logo (WhatsApp-style). */

import QRCode from "qrcode";
import { OPGB_QR_MARK_PATH } from "@/lib/opgb-qr-mark";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo-path";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export type BrandedQrOptions = {
  size?: number;
  margin?: number;
  /** Dark module color (default slate). */
  dark?: string;
  /** Light module / background (default white). */
  light?: string;
};

/**
 * High error-correction QR with centered OPGB mark.
 * Falls back to uploaded platform logo (`/api/platform/logo`) when the mark fails to load.
 */
export async function buildBrandedQrDataUrl(
  payload: string,
  opts: BrandedQrOptions = {},
): Promise<string> {
  const size = opts.size ?? 280;
  const margin = opts.margin ?? 2;
  const dark = opts.dark ?? "#0f172a";
  const light = opts.light ?? "#ffffff";

  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, payload, {
    width: size,
    margin,
    errorCorrectionLevel: "H",
    color: { dark, light },
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  let logo = await loadImage(OPGB_QR_MARK_PATH);
  if (!logo) logo = await loadImage(PLATFORM_LOGO_PATH);

  if (logo) {
    const logoSize = Math.round(size * 0.22);
    const pad = Math.round(logoSize * 0.18);
    const box = logoSize + pad * 2;
    const x = (size - box) / 2;
    const y = (size - box) / 2;
    const r = Math.max(6, box * 0.16);
    ctx.fillStyle = light === "#ffffff" || light === "#fff" ? "#ffffff" : light;
    if (light.length === 9 && light.endsWith("00")) {
      ctx.fillStyle = "#ffffff";
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + box, y, x + box, y + box, r);
    ctx.arcTo(x + box, y + box, x, y + box, r);
    ctx.arcTo(x, y + box, x, y, r);
    ctx.arcTo(x, y, x + box, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.drawImage(logo, x + pad, y + pad, logoSize, logoSize);
  }

  return canvas.toDataURL("image/png");
}
