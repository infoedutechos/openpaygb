import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import {
  cardIssuingNotReadyMessage,
  cardIssuingProvider,
  isCardIssuingConfigured,
  type IssueNetworkCardInput,
  type IssueNetworkCardResult,
} from "@/lib/card-issuing/types";
import { livePayIssueCard } from "@/lib/card-issuing/livepay-issuing";
import { visaVdpIssueCard } from "@/lib/card-issuing/visa-client";

export {
  cardIssuingProvider,
  isCardIssuingConfigured,
  cardIssuingNotReadyMessage,
  type IssueNetworkCardInput,
  type IssueNetworkCardResult,
} from "@/lib/card-issuing/types";
export { visaVdpHelloWorld } from "@/lib/card-issuing/visa-client";

/** Call configured issuer and persist a NetworkIssuedCard row (no PAN). */
export async function issueNetworkCard(
  input: IssueNetworkCardInput,
): Promise<{ result: IssueNetworkCardResult; recordId: string }> {
  if (!isCardIssuingConfigured()) {
    throw new Error(cardIssuingNotReadyMessage());
  }

  const provider = cardIssuingProvider();
  let result: IssueNetworkCardResult;
  if (provider === "livepay") {
    result = await livePayIssueCard(input);
  } else if (provider === "visa_vdp") {
    result = await visaVdpIssueCard(input);
  } else {
    throw new Error(cardIssuingNotReadyMessage());
  }

  const row = await withPrismaRetry(() =>
    prisma.networkIssuedCard.create({
      data: {
        studentId: input.studentId || null,
        organizationId: input.organizationId || null,
        holderName: input.holderName,
        email: input.email,
        phone: input.phoneE164 || "",
        provider: result.provider,
        providerCardId: result.providerCardId,
        providerToken: result.providerToken || "",
        last4: result.last4,
        network: result.network,
        status: result.status,
        currency: input.currency || "UGX",
        clientReference: input.clientReference,
      },
    }),
  );

  return { result, recordId: row.id };
}
