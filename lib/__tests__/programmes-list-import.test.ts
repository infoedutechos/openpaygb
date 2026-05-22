import { describe, it, expect } from "vitest";
import { parseProgrammesListCsv } from "@/lib/programmes-list-import";

describe("parseProgrammesListCsv", () => {
  it("parses comma rows without header", () => {
    const r = parseProgrammesListCsv("BEP,Bachelor of Education\nBAE,Bachelor of Arts");
    expect(r).toEqual([
      { code: "BEP", name: "Bachelor of Education", line: 1 },
      { code: "BAE", name: "Bachelor of Arts", line: 2 },
    ]);
  });

  it("skips header code,name", () => {
    const r = parseProgrammesListCsv("code,name\nPGD,Postgraduate Diploma");
    expect(r).toEqual([{ code: "PGD", name: "Postgraduate Diploma", line: 2 }]);
  });

  it("parses TSV", () => {
    const r = parseProgrammesListCsv("DEP\tDiploma Primary");
    expect(r).toEqual([{ code: "DEP", name: "Diploma Primary", line: 1 }]);
  });
});
