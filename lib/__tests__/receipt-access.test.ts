import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  canAccessConfirmedReceipt,
  createReceiptAccessToken,
  verifyReceiptAccessToken,
} from "@/lib/receipt-access";

describe("receipt-access", () => {
  const prev = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-min-16-chars";
  });

  afterEach(() => {
    process.env.JWT_SECRET = prev;
  });

  it("creates and verifies a token for confirmed payments", () => {
    const confirmedAt = new Date("2026-01-15T10:00:00.000Z");
    const payment = { id: "abc123", studentId: "stu1", confirmedAt };
    const token = createReceiptAccessToken(payment);
    expect(token).toBeTruthy();
    expect(verifyReceiptAccessToken(payment, token)).toBe(true);
    expect(verifyReceiptAccessToken(payment, "wrong")).toBe(false);
  });

  it("canAccessConfirmedReceipt allows admin, student owner, or token", () => {
    const confirmedAt = new Date();
    const payment = { id: "p1", studentId: "stu1", status: "confirmed", confirmedAt };
    const token = createReceiptAccessToken({ id: payment.id, studentId: payment.studentId, confirmedAt })!;
    expect(
      canAccessConfirmedReceipt({
        payment,
        token: null,
        isAdmin: true,
        studentUserId: null,
      }),
    ).toBe(true);
    expect(
      canAccessConfirmedReceipt({
        payment,
        token: null,
        isAdmin: false,
        studentUserId: "stu1",
      }),
    ).toBe(true);
    expect(
      canAccessConfirmedReceipt({
        payment,
        token,
        isAdmin: false,
        studentUserId: null,
      }),
    ).toBe(true);
    expect(
      canAccessConfirmedReceipt({
        payment,
        token: null,
        isAdmin: false,
        studentUserId: null,
      }),
    ).toBe(false);
  });
});
