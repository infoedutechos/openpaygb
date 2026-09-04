import { describe, expect, it } from "vitest";
import {
  isOpenPayCardMomoIssueMemo,
  maskedPanForStudent,
  openPayCardFundMemo,
  openPayCardIssueMemo,
} from "@/lib/openpay-card";

describe("openpay-card memos", () => {
  it("formats issue memo", () => {
    expect(openPayCardIssueMemo("abc123")).toBe("opcard:abc123");
  });

  it("formats fund memo", () => {
    expect(openPayCardFundMemo("card1", "top1")).toBe("opcardfund:card1:top1");
  });

  it("detects MoMo issue vs fund memos", () => {
    expect(isOpenPayCardMomoIssueMemo("opcardissuemomo:top1")).toBe(true);
    expect(isOpenPayCardMomoIssueMemo("opcardmomo:top1")).toBe(false);
  });
});

describe("maskedPanForStudent", () => {
  it("uses hex chars of student id in closed-loop display PAN", () => {
    expect(maskedPanForStudent("507f1f77bcf86cd799439011")).toMatch(/^6271 [0-9A-F]{2}XX XXXX [0-9A-F]{4}$/);
  });
});
