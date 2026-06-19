import {
  orgFaviconContentType,
  validateOrgFaviconBuffer,
} from "@/lib/validate-org-favicon";

export async function resolveOrgFaviconBodyBuffer(
  req: Request,
): Promise<{ ok: true; buf: Buffer } | { ok: false; error: string }> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return { ok: false, error: "Invalid multipart body" };
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: 'Expected multipart field "file" with the favicon.' };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    return { ok: true, buf };
  }

  if (ct.includes("application/octet-stream")) {
    const ab = await req.arrayBuffer().catch(() => null);
    if (!ab) return { ok: false, error: "Empty body" };
    return { ok: true, buf: Buffer.from(ab) };
  }

  return {
    ok: false,
    error: 'Use multipart form field "file", or Content-Type application/octet-stream.',
  };
}

export function validateOrgFaviconForSave(buf: Buffer):
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; error: string } {
  const validated = validateOrgFaviconBuffer(buf);
  if (!validated.ok) {
    return { ok: false, error: validated.reason };
  }
  return {
    ok: true,
    bytes: new Uint8Array(buf),
    contentType: orgFaviconContentType(buf),
  };
}
