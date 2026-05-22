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

  it("parses 4-column header with durationYears and semestersPerYear", () => {
    const csv = "code,name,durationYears,semestersPerYear\nBEP,Bachelor of Education,3,3\nDEP,Diploma in Education,2,3";
    expect(parseProgrammesListCsv(csv)).toEqual([
      { code: "BEP", name: "Bachelor of Education", line: 2, durationYears: 3, semestersPerYear: 3 },
      { code: "DEP", name: "Diploma in Education", line: 3, durationYears: 2, semestersPerYear: 3 },
    ]);
  });

  it("ignores invalid duration values (non-positive / non-integer)", () => {
    const csv = "code,name,durationYears,semestersPerYear\nBEP,Bachelor,0,abc";
    expect(parseProgrammesListCsv(csv)).toEqual([{ code: "BEP", name: "Bachelor", line: 2 }]);
  });

  it("handles names containing commas via double quotes", () => {
    const csv = 'code,name\n"BEP","Bachelor, Primary"';
    expect(parseProgrammesListCsv(csv)).toEqual([
      { code: "BEP", name: "Bachelor, Primary", line: 2 },
    ]);
  });

  it("supports TSV header with duration columns", () => {
    const tsv = "code\tname\tdurationYears\tsemestersPerYear\nBEP\tBachelor\t3\t3";
    expect(parseProgrammesListCsv(tsv)).toEqual([
      { code: "BEP", name: "Bachelor", line: 2, durationYears: 3, semestersPerYear: 3 },
    ]);
  });
});
