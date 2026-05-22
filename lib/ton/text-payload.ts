import { beginCell } from "@ton/core";

/** Base64 BOC for a wallet text comment (standard 32-bit opcode 0 + string tail). */
export function textCommentPayloadBase64(text: string): string {
  const trimmed = text.length > 120 ? text.slice(0, 120) : text;
  const cell = beginCell().storeUint(0, 32).storeStringTail(trimmed).endCell();
  return Buffer.from(cell.toBoc()).toString("base64");
}
