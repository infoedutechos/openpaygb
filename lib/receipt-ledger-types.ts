/** Client-safe receipt ledger types (no Prisma / server imports). */

export type ReceiptLedgerRowKind = "opening_balance" | "transaction" | "closing_balance";

export type ReceiptLedgerRow = {
  kind: ReceiptLedgerRowKind;
  date: Date | null;
  crDr: "" | "Dr" | "Cr";
  particulars: string;
  vchType: string;
  vchNo: string;
  debitUgx: number;
  creditUgx: number;
};

export type ReceiptLedger = {
  organizationName: string;
  studentName: string;
  programmeName: string;
  programmeCode: string;
  periodFrom: Date;
  periodTo: Date;
  openingBalanceUgx: number;
  closingBalanceUgx: number;
  rows: ReceiptLedgerRow[];
  totalDebitUgx: number;
  totalCreditUgx: number;
};
