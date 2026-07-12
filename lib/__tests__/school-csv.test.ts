import { describe, expect, it } from "vitest";
import { csvRow, parseCsv } from "@/lib/school-csv";

describe("school-csv", () => {
  it("round-trips simple rows", () => {
    const line = csvRow(["Name", "Amount", 100]);
    expect(line).toBe("Name,Amount,100");
    const rows = parseCsv(`${line}\nAlice,500,1`);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.[0]).toBe("Alice");
  });

  it("escapes commas and quotes", () => {
    const line = csvRow(['Say "hi"', "a,b"]);
    expect(parseCsv(line)[0]).toEqual(['Say "hi"', "a,b"]);
  });
});
