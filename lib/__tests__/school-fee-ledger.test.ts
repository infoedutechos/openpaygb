import { describe, expect, it } from "vitest";
import {
  computeFeeLedgerAmounts,
  deriveFeeLedgerStatus,
  mapSpreadsheetTermLabel,
  parseFeeLedgerMoney,
} from "@/lib/school-fee-ledger";
import { parseFeeLedgerCsv } from "@/lib/school-fee-ledger-import";

describe("school fee ledger math", () => {
  it("matches Hamiim Matovu spreadsheet formula", () => {
    const amounts = computeFeeLedgerAmounts({
      feeRequiredUgx: 600_000,
      previousBalanceUgx: 691_000,
      previousBalancePaidUgx: 691_000,
      currentTermPaidUgx: 76_000,
    });
    expect(amounts.totalOutstandingUgx).toBe(524_000);
    expect(amounts.currentBalanceUgx).toBe(524_000);
    expect(deriveFeeLedgerStatus({ ...amounts, ...{
      feeRequiredUgx: 600_000,
      previousBalanceUgx: 691_000,
      previousBalancePaidUgx: 691_000,
      currentTermPaidUgx: 76_000,
    } }).status).toBe("partial_payment");
  });

  it("marks cleared when fully paid", () => {
    const amounts = computeFeeLedgerAmounts({
      feeRequiredUgx: 500_000,
      previousBalanceUgx: 0,
      previousBalancePaidUgx: 0,
      currentTermPaidUgx: 500_000,
    });
    expect(amounts.totalOutstandingUgx).toBe(0);
    expect(deriveFeeLedgerStatus({
      feeRequiredUgx: 500_000,
      previousBalanceUgx: 0,
      previousBalancePaidUgx: 0,
      currentTermPaidUgx: 500_000,
      totalOutstandingUgx: 0,
    }).statusLabel).toBe("Cleared");
  });

  it("parses --- and CLEARED money cells", () => {
    expect(parseFeeLedgerMoney("---")).toBe(0);
    expect(parseFeeLedgerMoney("691,000paid")).toBe(691000);
    expect(parseFeeLedgerMoney("CLEARED")).toBe(0);
  });

  it("maps Jun–Aug to term 2 and July–Sept to term 3", () => {
    expect(mapSpreadsheetTermLabel("JUN – AUG").term).toBe(2);
    expect(mapSpreadsheetTermLabel("JULY – SEPT").term).toBe(3);
  });
});

describe("fee ledger CSV parse", () => {
  it("parses Uwais-style headers", () => {
    const csv = [
      "NO.,NAME,CLASS,NEW TERM,PAYS,O/BLC,PAID/DEBT,PAID/N.T,BALANCE,TOTAL",
      "1,Hamiim Matovu,P4,JUN – AUG,600000,691000,691000,76000,524000,",
      "2,Abubakar Umar,P4,JUN – AUG,500000,---,---,170000,330000,Nxt wk",
    ].join("\n");
    const rows = parseFeeLedgerCsv(csv, 2);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe("Hamiim Matovu");
    expect(rows[0]?.feeRequiredUgx).toBe(600000);
    expect(rows[0]?.previousBalanceUgx).toBe(691000);
    expect(rows[0]?.previousBalancePaidUgx).toBe(691000);
    expect(rows[0]?.currentTermPaidUgx).toBe(76000);
    expect(rows[1]?.statusNote).toBe("Nxt wk");
    expect(rows[1]?.previousBalanceUgx).toBe(0);
  });
});
