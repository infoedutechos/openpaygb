import { describe, expect, it } from "vitest";
import { buildReceiptLedger } from "@/lib/receipt-ledger";

describe("buildReceiptLedger", () => {
  it("builds Dr invoice and Cr receipt rows with closing balance", () => {
    const ledger = buildReceiptLedger({
      organizationName: "TEAM UNIVERSITY",
      studentName: "Nabiddo Rehema",
      programmeName: "BBA",
      programmeCode: "BBA",
      programmeFees: [],
      focusPaymentId: "pay1",
      payments: [
        {
          id: "pay1",
          status: "confirmed",
          rail: "livepay",
          tuitionUgx: 800_000,
          functionalFeesUgx: 78_000,
          totalUgx: 878_000,
          platformFeeUgx: 0,
          tonAmount: 0,
          year: 1,
          semester: 1,
          confirmedAt: new Date("2023-08-01"),
          createdAt: new Date("2023-08-01"),
        },
      ],
    });

    expect(ledger.organizationName).toBe("TEAM UNIVERSITY");
    expect(ledger.rows.some((r) => r.vchType === "Invoice" && r.crDr === "Dr")).toBe(true);
    expect(ledger.rows.some((r) => r.vchType === "Receipt" && r.crDr === "Cr")).toBe(true);
    expect(ledger.rows.some((r) => r.particulars === "Closing Balance")).toBe(true);
    expect(ledger.totalDebitUgx).toBe(ledger.totalCreditUgx);
  });
});
