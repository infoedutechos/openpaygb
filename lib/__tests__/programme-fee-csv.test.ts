import { describe, expect, it } from "vitest";
import { parseProgrammeFeeUploadCsv, programmeFeeCsvTemplate } from "@/lib/programme-fee-csv";

describe("parseProgrammeFeeUploadCsv", () => {
  it("parses bundled template with header row", () => {
    const r = parseProgrammeFeeUploadCsv(programmeFeeCsvTemplate());
    expect(r.parseErrors).toEqual([]);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toMatchObject({
      feeKey: "tuition_block",
      lineType: "tuition",
      amountUgx: 1_500_000,
      recurrence: "per_semester",
      year: 1,
      semester: 1,
    });
    expect(r.rows[1]).toMatchObject({
      feeKey: "library_levy",
      lineType: "functional",
      recurrence: "per_year",
      semester: 0,
    });
    expect(r.rows[2]).toMatchObject({
      feeKey: "exam_fee",
      recurrence: "once",
      year: 2,
      semester: 2,
    });
  });

  it("parses fixed column order without header", () => {
    const csv = ["func_a,Functional,100,Paid once,3,1"].join("\n");
    const r = parseProgrammeFeeUploadCsv(csv);
    expect(r.parseErrors).toEqual([]);
    expect(r.rows[0]).toMatchObject({
      feeKey: "func_a",
      lineType: "functional",
      amountUgx: 100,
      recurrence: "once",
      year: 3,
      semester: 1,
    });
  });
});
