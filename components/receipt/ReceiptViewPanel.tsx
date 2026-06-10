"use client";

import type { ReceiptBreakdown } from "@/lib/receipt-lines";
import type { ReceiptLedger } from "@/lib/receipt-ledger";
import { ReceiptFeeBreakdown } from "@/components/receipt/ReceiptFeeBreakdown";
import { ReceiptLedgerAccount } from "@/components/receipt/ReceiptLedgerAccount";
import { TabbedCardPanel } from "@/components/ui/TabbedCardPanel";

export function ReceiptViewPanel({
  ledger,
  breakdown,
  variant = "dark",
}: {
  ledger: ReceiptLedger;
  breakdown: ReceiptBreakdown;
  variant?: "dark" | "light";
}) {
  return (
    <TabbedCardPanel
      defaultTabId="ledger"
      tabs={[
        {
          id: "ledger",
          label: "Ledger account",
          content: <ReceiptLedgerAccount ledger={ledger} variant={variant} />,
        },
        {
          id: "breakdown",
          label: "Fee breakdown",
          content: <ReceiptFeeBreakdown breakdown={breakdown} variant={variant} />,
        },
      ]}
    />
  );
}
