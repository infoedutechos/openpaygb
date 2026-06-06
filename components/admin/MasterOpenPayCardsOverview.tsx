"use client";

import { OpenPayCardsRegistryPanel } from "@/components/admin/OpenPayCardsRegistryPanel";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

export function MasterOpenPayCardsOverview() {
  return (
    <OpenPayCardsRegistryPanel
      apiPath="/api/master/openpay-cards"
      description={`Platform-wide view of issued student cards, UGX balances, and TON top-ups. Issue fees and card toggles are configured in the section above.`}
      title={`${OPEN_PAY_BRAND} card registry`}
      showSchoolColumn
    />
  );
}
