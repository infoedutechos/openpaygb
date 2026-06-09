import { describe, expect, it } from "vitest";
import {
  cardTopupMessage,
  paymentConfirmedMessage,
  tuitionDueReminderMessage,
} from "@/lib/telegram/templates";

describe("telegram templates", () => {
  it("payment confirmed includes receipt and mini app links", { timeout: 15_000 }, () => {
    const html = paymentConfirmedMessage({
      programmeCode: "BSIT",
      year: 2,
      semester: 1,
      tonAmount: 1.5,
      totalUgx: 500000,
      receiptUrl: "https://app.example/receipt/abc",
    });
    expect(html).toContain("Payment confirmed");
    expect(html).toContain("/tma");
    expect(html).toContain("View receipt");
  });

  it("card topup message", () => {
    const html = cardTopupMessage({
      amountUgx: 100000,
      newBalanceUgx: 1245000,
      studentName: "John",
    });
    expect(html).toContain("topped up");
    expect(html).toContain("1,245,000");
  });

  it("tuition due reminder", () => {
    const html = tuitionDueReminderMessage({
      studentName: "Ada",
      organizationName: "Example U",
      programmeCode: "BSC",
      outstandingUgx: 2450000,
    });
    expect(html).toContain("Tuition reminder");
    expect(html).toContain("Pay now");
  });
});
