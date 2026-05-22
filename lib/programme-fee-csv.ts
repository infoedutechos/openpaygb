/**
 * Parse bulk fee rows from CSV/TSV for admin programme fee upload.
 * Columns: Item, Line Type, Amount, Fee Charge Category, Academic Year, Semester
 */

export type FeeUploadLineType = "tuition" | "functional";
export type FeeUploadRecurrence = "once" | "per_semester" | "per_year";

export type ParsedFeeUploadRow = {
  sourceLine: number;
  feeKey: string;
  lineType: FeeUploadLineType;
  amountUgx: number;
  recurrence: FeeUploadRecurrence;
  year: number;
  semester: number;
};

export type ParsedFeeUploadResult = {
  rows: ParsedFeeUploadRow[];
  parseErrors: string[];
};

const TEMPLATE_LINES = [
  "Item,Line Type,Amount,Fee Charge Category,Academic Year,Semester",
  "tuition_block,Tuition,1500000,Per semester,1,1",
  "library_levy,Functional,50000,Per year,1,",
  "exam_fee,Functional,25000,Paid once,2,2",
] as const;

export function programmeFeeCsvTemplate(): string {
  return TEMPLATE_LINES.join("\r\n");
}

function splitDelimitedRow(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && c === delim) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function detectDelimiter(line: string): string {
  const tabs = (line.match(/\t/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/\s+/g, " ");
}

function parseLineType(raw: string): FeeUploadLineType | null {
  const t = raw.trim().toLowerCase();
  if (t === "tuition" || t === "t") return "tuition";
  if (t === "functional" || t === "function" || t === "f") return "functional";
  return null;
}

function parseRecurrence(raw: string): FeeUploadRecurrence | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (
    t === "once" ||
    t === "paid once" ||
    t.startsWith("paid once") ||
    t.includes("one-time")
  ) {
    return "once";
  }
  if (
    t === "per_semester" ||
    t === "per semester" ||
    t.includes("per semester") ||
    t.includes("paid per semester") ||
    t.includes("each semester") ||
    t === "semester"
  ) {
    return "per_semester";
  }
  if (
    t === "per_year" ||
    t === "per year" ||
    t.includes("per year") ||
    t.includes("paid per year") ||
    t.includes("annual")
  ) {
    return "per_year";
  }
  return null;
}

function headerColumnIndex(headers: string[], ...aliases: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (let i = 0; i < norm.length; i++) {
    const h = norm[i];
    for (const a of aliases) {
      if (h === a || h.includes(a)) return i;
    }
  }
  return -1;
}

function looksLikeHeaderRow(cells: string[]): boolean {
  const norm = cells.map(normalizeHeader);
  const hasItem = norm.some(
    (h) => h === "item" || h === "fee item" || h === "fee key" || h === "fee_key" || h.endsWith(" item")
  );
  const hasAmount = norm.some((h) => h === "amount" || h === "ugx" || h.includes("amount"));
  return hasItem && hasAmount;
}

export function parseProgrammeFeeUploadCsv(text: string): ParsedFeeUploadResult {
  const parseErrors: string[] = [];
  const rows: ParsedFeeUploadRow[] = [];
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = rawLines
    .map((line, idx) => ({ line, idx: idx + 1 }))
    .filter((x) => x.line.length > 0);
  if (nonEmpty.length === 0) {
    parseErrors.push("File is empty.");
    return { rows, parseErrors };
  }

  const delim = detectDelimiter(nonEmpty[0].line);
  const firstCells = splitDelimitedRow(nonEmpty[0].line, delim);
  let start = 0;
  let colItem = 0;
  let colLineType = 1;
  let colAmount = 2;
  let colRecurrence = 3;
  let colYear = 4;
  let colSem = 5;

  if (looksLikeHeaderRow(firstCells)) {
    const headers = firstCells;
    const iItem = headerColumnIndex(headers, "item", "fee key", "fee_key", "fee item");
    const iType = headerColumnIndex(headers, "line type", "type", "line_type");
    const iAmt = headerColumnIndex(headers, "amount", "ugx", "amount (ugx)");
    const iRec = headerColumnIndex(
      headers,
      "fee charge category",
      "fee charge",
      "recurrence",
      "charge category"
    );
    const iYear = headerColumnIndex(headers, "academic year", "year");
    const iSem = headerColumnIndex(headers, "semester", "sem");
    if (iItem < 0 || iType < 0 || iAmt < 0 || iRec < 0 || iYear < 0 || iSem < 0) {
      parseErrors.push(
        "Header row found but could not map all columns. Use: Item, Line Type, Amount, Fee Charge Category, Academic Year, Semester."
      );
      return { rows, parseErrors };
    }
    colItem = iItem;
    colLineType = iType;
    colAmount = iAmt;
    colRecurrence = iRec;
    colYear = iYear;
    colSem = iSem;
    start = 1;
  }

  for (let j = start; j < nonEmpty.length; j++) {
    const { line, idx } = nonEmpty[j];
    const cells = splitDelimitedRow(line, delim);
    const need = Math.max(colItem, colLineType, colAmount, colRecurrence, colYear, colSem) + 1;
    if (cells.length < need) {
      parseErrors.push(`Line ${idx}: not enough columns (need at least ${need}, got ${cells.length}).`);
      continue;
    }
    const feeKey = cells[colItem]?.trim() ?? "";
    if (!feeKey) {
      parseErrors.push(`Line ${idx}: Item is empty.`);
      continue;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(feeKey)) {
      parseErrors.push(`Line ${idx}: Item "${feeKey}" — use letters, numbers, hyphens, underscores only.`);
      continue;
    }
    const lineType = parseLineType(cells[colLineType] ?? "");
    if (!lineType) {
      parseErrors.push(`Line ${idx}: Line Type must be Tuition or Functional (got "${cells[colLineType]}").`);
      continue;
    }
    const amtRaw = (cells[colAmount] ?? "").replace(/,/g, "").trim();
    const amountUgx = Math.round(Number(amtRaw));
    if (!Number.isFinite(amountUgx) || amountUgx < 0) {
      parseErrors.push(`Line ${idx}: Invalid Amount.`);
      continue;
    }
    const recurrence = parseRecurrence(cells[colRecurrence] ?? "");
    if (!recurrence) {
      parseErrors.push(
        `Line ${idx}: Fee Charge Category not recognized (use Paid once, Per semester, or Per year). Got "${cells[colRecurrence]}".`
      );
      continue;
    }
    const year = Math.min(6, Math.max(1, Math.round(Number((cells[colYear] ?? "").replace(/,/g, ""))) || 0));
    if (!Number.isFinite(year) || year < 1) {
      parseErrors.push(`Line ${idx}: Academic Year must be 1–6.`);
      continue;
    }
    const semRaw = (cells[colSem] ?? "").trim();
    let semester: number;
    if (recurrence === "per_year") {
      semester = 0;
    } else {
      const s = Math.round(Number(semRaw));
      if (!Number.isFinite(s) || s < 1 || s > 3) {
        parseErrors.push(`Line ${idx}: Semester must be 1–3 for this fee charge (got "${semRaw}").`);
        continue;
      }
      semester = s;
    }

    rows.push({
      sourceLine: idx,
      feeKey,
      lineType,
      amountUgx,
      recurrence,
      year,
      semester,
    });
  }

  return { rows, parseErrors };
}
