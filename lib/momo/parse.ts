/** Heuristic parsing for MTN MoMo / Airtel-style collect callbacks (shape varies by product). */

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function numToStr(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** External reference / id from provider payload — try several common keys and shallow nesting. */
export function extractMomoReference(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const direct = [
    "referenceId",
    "reference",
    "externalId",
    "XReferenceId",
    "paymentRef",
    "orderId",
    "transactionId",
    "financialTransactionId",
    "payeeNote",
  ];
  for (const k of direct) {
    const s = str(o[k]) ?? numToStr(o[k]);
    if (s) return s;
  }

  const resource = o.resource;
  if (resource && typeof resource === "object") {
    const r = resource as Record<string, unknown>;
    const s = str(r.referenceId) ?? str(r.reference) ?? numToStr(r.financialTransactionId);
    if (s) return s;
  }

  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const s = str(d.referenceId) ?? str(d.reference) ?? str(d.externalId);
    if (s) return s;
  }

  return null;
}

/** Whether the provider reports a completed successful collection. */
export function isMomoSuccessStatus(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;

  const tryStr = (s: unknown) => typeof s === "string" && /^(SUCCESSFUL|SUCCESS|COMPLETED|PAID|CONFIRMED)$/i.test(s);

  if (tryStr(o.status)) return true;
  if (tryStr(o.Status)) return true;

  const st = o.status;
  if (st && typeof st === "object") {
    const inner = (st as Record<string, unknown>).status;
    if (typeof inner === "string" && /success|completed|paid/i.test(inner)) return true;
  }

  const successful = o.successful;
  if (successful === true) return true;

  const statusCode = o.statusCode;
  if (typeof statusCode === "string" && /^200|201$/i.test(statusCode)) {
    if (o.referenceId || o.resource) return true;
  }

  return false;
}
