import "server-only";

import { getActiveUgxPerTonForOrganization } from "@/lib/fx";

/** MoMo issue fee in UGX from platform TON fee and org FX (min UGX 1,000). */
export async function openPayCardIssueFeeUgx(
  issueFeeTon: number,
  organizationId: string,
): Promise<{ amountUgx: number; ugxPerTon: number; source: string }> {
  const { ugxPerTon, source } = await getActiveUgxPerTonForOrganization(organizationId);
  const amountUgx = Math.max(1000, Math.ceil(issueFeeTon * ugxPerTon));
  return { amountUgx, ugxPerTon, source };
}
