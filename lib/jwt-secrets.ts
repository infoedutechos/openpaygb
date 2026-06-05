/** Per-family JWT secrets with fallback to JWT_SECRET for backward compatibility. */

function readSecret(primary: string | undefined, fallback: string | undefined): string | null {
  const s = (primary?.trim() || fallback?.trim()) ?? "";
  return s.length >= 16 ? s : null;
}

export function jwtSecretAdminBytes(): Uint8Array | null {
  const s = readSecret(process.env.JWT_SECRET_ADMIN, process.env.JWT_SECRET);
  return s ? new TextEncoder().encode(s) : null;
}

export function jwtSecretStudentBytes(): Uint8Array | null {
  const s = readSecret(process.env.JWT_SECRET_STUDENT, process.env.JWT_SECRET);
  return s ? new TextEncoder().encode(s) : null;
}

export function jwtSecretCheckoutBytes(): Uint8Array | null {
  const s = readSecret(process.env.JWT_SECRET_CHECKOUT, process.env.JWT_SECRET);
  return s ? new TextEncoder().encode(s) : null;
}

export function jwtSecretReceiptBytes(): Uint8Array | null {
  const s = readSecret(process.env.JWT_SECRET_RECEIPT, process.env.JWT_SECRET_CHECKOUT ?? process.env.JWT_SECRET);
  return s ? new TextEncoder().encode(s) : null;
}
