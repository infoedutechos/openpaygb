/** Fee lines to show in checkout UI (never use an empty poolLines array when lines exist). */
export function feePoolForDisplay<T extends { id: string }>(quote: {
  poolLines?: T[];
  lines?: T[];
}): T[] {
  if (quote.poolLines && quote.poolLines.length > 0) return quote.poolLines;
  if (quote.lines && quote.lines.length > 0) return quote.lines;
  return [];
}
