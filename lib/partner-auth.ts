import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractPartnerApiKeyFromRequest,
  hashPartnerApiKey,
  partnerKeyHasScope,
  type PartnerScope,
} from "@/lib/partner-api-key";

export type PartnerAuthContext = {
  keyId: string;
  keyName: string;
  organizationId: string | null;
  scopes: string[];
};

export async function requirePartnerAuth(
  req: Request,
  scope: PartnerScope,
): Promise<{ ok: true; partner: PartnerAuthContext } | { ok: false; response: NextResponse }> {
  const plain = extractPartnerApiKeyFromRequest(req);
  if (!plain) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing API key — use Authorization: Bearer odelhub_live_… or X-Api-Key" },
        { status: 401 },
      ),
    };
  }

  const keyHash = hashPartnerApiKey(plain);
  const row = await prisma.partnerApiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      name: true,
      enabled: true,
      organizationId: true,
      scopes: true,
    },
  });

  if (!row || !row.enabled) {
    return { ok: false, response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  if (!partnerKeyHasScope(row.scopes, scope)) {
    return { ok: false, response: NextResponse.json({ error: "Insufficient scope" }, { status: 403 }) };
  }

  void prisma.partnerApiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    ok: true,
    partner: {
      keyId: row.id,
      keyName: row.name,
      organizationId: row.organizationId,
      scopes: row.scopes,
    },
  };
}
