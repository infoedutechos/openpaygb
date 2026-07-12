import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildSchoolReportPdf(input: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | number)[][];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]);
  let y = 800;
  const margin = 40;
  const lineHeight = 14;

  function drawText(text: string, x: number, size: number, bold = false) {
    page.drawText(text.slice(0, 80), { x, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  }

  drawText(input.title, margin, 16, true);
  drawText(input.subtitle, margin, 10);
  y -= 8;

  const colWidth = (595 - margin * 2) / Math.max(input.headers.length, 1);
  input.headers.forEach((h, i) => {
    page.drawText(String(h).slice(0, 18), { x: margin + i * colWidth, y, size: 9, font: fontBold });
  });
  y -= lineHeight;

  for (const row of input.rows) {
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    row.forEach((cell, i) => {
      page.drawText(String(cell).slice(0, 22), { x: margin + i * colWidth, y, size: 8, font });
    });
    y -= lineHeight;
  }

  return pdf.save();
}
