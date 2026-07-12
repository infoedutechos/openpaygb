/** CSV helpers for school import/export (Excel-compatible). */

export function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map((c) => csvEscape(c == null ? "" : String(c))).join(",");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export function csvResponse(filename: string, header: string[], dataRows: (string | number)[][]): Response {
  const lines = [csvRow(header), ...dataRows.map((r) => csvRow(r))];
  const body = lines.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function mapCsvHeaders(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((h, i) => map.set(h.trim().toLowerCase(), i));
  return map;
}

export function csvCell(row: string[], headers: Map<string, number>, key: string): string {
  const idx = headers.get(key.toLowerCase());
  if (idx == null) return "";
  return (row[idx] ?? "").trim();
}
