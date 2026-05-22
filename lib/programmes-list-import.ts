/** Strip UTF-8 BOM often added by Excel. */
export function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

export type ParsedProgrammeLine = { code: string; name: string; line: number };

/**
 * Parse a programmes list from CSV or TSV.
 * - Optional header row: `code,name` (or `code<TAB>name`), case-insensitive.
 * - Data rows: `CODE,Name of programme` or tab-separated. Names may be `"quoted"` if they contain commas.
 */
export function parseProgrammesListCsv(text: string): ParsedProgrammeLine[] {
  const raw = stripBom(text).trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/);
  let start = 0;
  const first = lines[0]?.trim() ?? "";
  if (/^code\s*,\s*name\s*$/i.test(first) || /^code\s*\t\s*name\s*$/i.test(first)) {
    start = 1;
  }

  const out: ParsedProgrammeLine[] = [];
  for (let i = start; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i]?.trim();
    if (!line) continue;

    if (line.includes("\t")) {
      const tab = line.indexOf("\t");
      const code = line.slice(0, tab).trim().replace(/^"|"$/g, "");
      const name = line.slice(tab + 1).trim().replace(/^"|"$/g, "");
      if (code && name) out.push({ code, name, line: lineNum });
      continue;
    }

    const unquoted = line.match(/^"([^"]*)"\s*,\s*"(.*)"\s*$/);
    if (unquoted) {
      const code = unquoted[1]!.trim();
      const name = unquoted[2]!.trim();
      if (code && name) out.push({ code, name, line: lineNum });
      continue;
    }

    const comma = line.indexOf(",");
    if (comma === -1) continue;
    const code = line.slice(0, comma).trim().replace(/^"|"$/g, "");
    const name = line.slice(comma + 1).trim().replace(/^"|"$/g, "");
    if (code && name) out.push({ code, name, line: lineNum });
  }
  return out;
}
