/**
 * ODELHUB mobile-money brand (payer-facing).
 * Collections run on MbiyoPay infrastructure — see MBIYO_PAY_INFRA_NAME and admin copy helpers.
 */

export const OPEN_PAY_GLOBAL_NAME = "OpenPayGlobal";
export const OPEN_PAY_GLOBAL_SHORT = "OpenPayGb";

/** MbiyoPay merchant API / webhooks (infrastructure; not shown to payers). */
export const MBIYO_PAY_INFRA_NAME = "MbiyoPay";

/** Primary payer-facing label, e.g. section headers */
export const openPayGlobalLabel = `${OPEN_PAY_GLOBAL_NAME} (${OPEN_PAY_GLOBAL_SHORT})`;

export const openPayGlobalMobileMoneyLabel = `${openPayGlobalLabel} · mobile money`;

/** Admin / ops: brand vs provider */
export const openPayGlobalInfrastructureNote =
  `${openPayGlobalLabel} is the checkout brand payers see; mobile-money payins use ${MBIYO_PAY_INFRA_NAME} infrastructure (ledger rail \`mbiyo\`).`;

/** e.g. "TON or OpenPayGlobal" */
export function withOpenPayGlobal(alternative: string): string {
  return `${alternative} or ${OPEN_PAY_GLOBAL_NAME}`;
}

/** e.g. stepper / status lines */
export function openPayGlobalStatus(suffix: string): string {
  return `${OPEN_PAY_GLOBAL_NAME} — ${suffix}`;
}
