/** Strip UTF-8 BOM often added by Excel. */
export function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

export type ParsedProgrammeLine = {
  code: string;
  name: string;
  line: number;
  /** Optional explicit duration; absent for legacy 2-column imports. */
  durationYears?: number;
  /** Optional explicit semesters / academic year; absent for legacy 2-column imports. */
  semestersPerYear?: number;
};

const KNOWN_HEADERS = new Set(["code", "name", "durationyears", "semestersperyear"]);

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function splitCsvRow(row: string): string[] {
  /** Minimal CSV row tokeniser that respects "quoted, fields" with escaped doubled quotes. */
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"') {
        if (row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((s) => s.trim());
}

function splitTsvRow(row: string): string[] {
  return row.split("\t").map((s) => s.trim().replace(/^"|"$/g, ""));
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return undefined;
  return n;
}

/**
 * Parse a programmes list from CSV or TSV.
 * - Optional header row supporting:
 *     - `code,name`
 *     - `code,name,durationYears,semestersPerYear` (extra columns optional and in any order)
 * - Data rows: `CODE,Name of programme[,Years[,SemestersPerYear]]`. Tab-separated also supported.
 * - Names may be `"quoted"` if they contain commas; doubled quotes inside quoted fields are escaped.
 */
export function parseProgrammesListCsv(text: string): ParsedProgrammeLine[] {
  const raw = stripBom(text).trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/);
  let start = 0;
  let headerMap: { code: number; name: number; durationYears: number; semestersPerYear: number } = {
    code: 0,
    name: 1,
    durationYears: -1,
    semestersPerYear: -1,
  };

  const firstRaw = lines[0] ?? "";
  const isTsv = firstRaw.includes("\t");
  const firstFields = isTsv ? splitTsvRow(firstRaw) : splitCsvRow(firstRaw);
  const normalizedFirst = firstFields.map(normalizeHeader);
  const looksLikeHeader =
    normalizedFirst.length >= 2 &&
    normalizedFirst[0] === "code" &&
    normalizedFirst[1] === "name" &&
    normalizedFirst.every((h) => KNOWN_HEADERS.has(h));

  if (looksLikeHeader) {
    headerMap = {
      code: normalizedFirst.indexOf("code"),
      name: normalizedFirst.indexOf("name"),
      durationYears: normalizedFirst.indexOf("durationyears"),
      semestersPerYear: normalizedFirst.indexOf("semestersperyear"),
    };
    start = 1;
  }

  const out: ParsedProgrammeLine[] = [];
  for (let i = start; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const fields = trimmed.includes("\t") ? splitTsvRow(trimmed) : splitCsvRow(trimmed);
    if (fields.length < 2) continue;

    const code = (fields[headerMap.code] ?? "").trim().replace(/^"|"$/g, "");
    const name = (fields[headerMap.name] ?? "").trim().replace(/^"|"$/g, "");
    if (!code || !name) continue;

    const durationYears =
      headerMap.durationYears >= 0 ? parseOptionalInt(fields[headerMap.durationYears]) : undefined;
    const semestersPerYear =
      headerMap.semestersPerYear >= 0 ? parseOptionalInt(fields[headerMap.semestersPerYear]) : undefined;

    out.push({
      code,
      name,
      line: lineNum,
      ...(durationYears !== undefined ? { durationYears } : {}),
      ...(semestersPerYear !== undefined ? { semestersPerYear } : {}),
    });
  }
  return out;
}
