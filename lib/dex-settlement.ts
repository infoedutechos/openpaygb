import "server-only";

/** Where users complete crypto delivery after custodial OPGB debit. */
export function dexSettlementNextPath(outputAsset: string): string {
  const asset = outputAsset.toUpperCase();
  if (asset === "TON") return "/dex/onramp";
  return "/dex/buy";
}

export function dexSettlementNote(outputAsset: string): string {
  const path = dexSettlementNextPath(outputAsset);
  return `OPGB debited. Complete ${outputAsset} delivery at ${path} or await platform settlement.`;
}
